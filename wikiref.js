(function () {
	/**
	 * Check and set a global guard variable.
	 * If this content script is injected into the same page again,
	 * it will do nothing next time.
	 */
	if (window.hasRun) {
		return;
	}
	window.hasRun = true;

	const DOWNLOAD = "downloadMessage";
	const DEFAULT_TEXTAREA_COLS = 40;
	const DEFAULT_TEXTAREA_ROWS = 3;

	/**
	 * Extracts a reference from a child element.
	 * This should be an <li>
	 */
	function extractReference(child, index) {
		var ref = {
			id: index,
			text: "",
			links: [],
		};

		ref.text = child.innerText;
		var a_children = child.getElementsByTagName("a");
		for (var k = 0; k < a_children.length; k++) {
			// Extract the unique links that are external references only (for now)
			if (
				a_children[k].classList.contains("external") &&
				a_children[k].rel === "nofollow" &&
				!ref.links.includes(a_children[k].href)
			) {
				ref.links.push(a_children[k].href);
			}
		}
		return ref;
	}

	/**
	 * Extract all the references from a given
	 * user-provided selection, or try to find
	 * and extract the location of these
	 * references if no selection is provided.
	 */
	function extractReferencesFromSelection(selection) {
		var references = [];
		var startIndex = 0;
		// Seeing what's already in localStorage, if
		// anything. If there is something, update the data to include the
		// new additions. This'll enable one to combine references from
		// different parts of the same document.
		var localStorageContents = localStorage.getItem(getBaseURI());
		if (localStorageContents !== null) {
			var oldRefs = JSON.parse(localStorageContents);
			startIndex = oldRefs.length;
			references = oldRefs;
		}
		// Need to differentiate a few different cases
		if (selection === null) {
			//	1. element is "null" -> try to auto-extract using heuristic of finding
			//		last element with class "references" in document
			var referenceElements = document.getElementsByClassName("references");
			var referenceList = referenceElements[referenceElements.length - 1];
			var children = referenceList.children;
			if (children.length > 0) {
				for (var i = 0; i < children.length; i++) {
					references.push(extractReference(children[i], i + startIndex));
				}
			}
		} else if (selection.nodeName === "LI") {
			//	2. element.nodeName is "LI" -> extract refs from list item and update
			//		localStorage appropriately
			references.push(extractReference(selection, startIndex));
		} else if (selection.nodeName === "UL" || selection.nodeName === "OL") {
			//	3. element.nodeName is "UL" or "OL" -> extract refs from list of refs
			//		and update localStorage appropriately
			var children = selection.children;
			if (children.length > 0) {
				for (var i = 0; i < children.length; i++) {
					references.push(extractReference(children[i], i + startIndex));
				}
			}
		}

		localStorage.setItem(getBaseURI(), JSON.stringify(references));
		// Update display status of Delete References
		// option so it'll be visible when references have
		// been added to localStorage. We'll listen
		// for the storage.local.onChanged event in the
		// background script and update styling of the
		// popup appropriately
		var deleteRefsHidden = {};
		deleteRefsHidden[tabURL] = { hidden: false };

		return browser.storage.local.set(deleteRefsHidden);
	}

	/**
	 * Gets base URI by trimming extra characters that might
	 * indicate an article heading.
	 */
	function getBaseURI(uri = null) {
		if (uri !== null) {
			return uri.split("#")[0];
		}
		return document.baseURI.split("#")[0];
	}

	var editingEnabled = false;
	/**
	 * Enables editing of the "Display References" popup by
	 * inserting an event listener on the <table> element
	 * contained in the popup <div> that will enable
	 * selective editing of the items in the table.
	 */
	function enableEditReferences() {
		// If we click the "Edit" icon again,
		// we'll disable editing, which is a
		// fairly intuitive UX
		if (editingEnabled) {
			disableEditReferences();
			return;
		}
		editingEnabled = true;
		// change styling of edit button and icon to
		// indicate we're in edit more
		var editButton = document.getElementById("reference-list-edit-button");
		editButton.style.background = "black";
		var editIcon = document.getElementById("reference-list-edit-icon");
		editIcon.style.color = "white";
		var refListPopupTable = document.getElementById(
			"reference-list-popup-table"
		);
		refListPopupTable.addEventListener("click", handleRefTableClick);
	}

	/**
	 * Disables editing of the "Display References" popup by
	 * removing the event listener on the <table> element
	 * contained in the popup <div> that enabled
	 * selective editing of the items in the table.
	 */
	function disableEditReferences() {
		if (!editingEnabled) {
			return;
		}
		editingEnabled = false;
		// change styling of edit button and icon to
		// indicate we're no longer in edit more
		var editButton = document.getElementById("reference-list-edit-button");
		editButton.style.background = "";
		var editIcon = document.getElementById("reference-list-edit-icon");
		editIcon.style.color = "";
		var refListPopupTable = document.getElementById(
			"reference-list-popup-table"
		);
		refListPopupTable.removeEventListener("click", handleRefTableClick);
	}

	/**
	 * Handles click events on the "Display References" popup
	 * table
	 */
	function handleRefTableClick(ev) {
		try {
			var [editInput, referenceId, referenceType, linkNumber] =
				editReferencesHandler(ev);
			if (editInput !== null && editInput !== undefined) {
				// Remove the onclick event listener from the table
				// at this point so that clicking on other inputs
				// before editing is completed does nothing.
				disableEditReferences();
				// Add onchange listener to input for when editing happens
				editInput.onchange = (event) => {
					editReferencesInputChangeHandler(
						referenceId,
						referenceType,
						linkNumber,
						event.target.value
					);
				};
				editInput.onblur = () => {
					// Check for presence of a textarea element, which would
					// indicate that we clicked on the element, but didn't change
					// anything before unfocusing it again. Let's remove it.
					var inputElement = document.getElementById(
						getTextareaID(referenceId, referenceType)
					);
					if (inputElement !== null) {
						inputElement.parentElement.removeChild(inputElement);
						// Redisplay the <p>
						modifyElementVisibility(
							referenceId,
							referenceType,
							linkNumber,
							true
						);
					}
					// Re-enable editing now that the input has been
					// unfocused, which would happen after editing was
					// finished and/or unedited textarea has been unfocused
					enableEditReferences();
				};
			}
		} catch (error) {
			console.error(
				"Error encountered when calling editReferencesHandler()! Error: ",
				error
			);
		}
	}

	/**
	 * Constructs textarea element ID using the given
	 * parameters
	 */
	function getTextareaID(referenceId, referenceType) {
		return `reference-item-input-${referenceType}-${referenceId}`;
	}

	/**
	 * Shows or hides an element based on the referenceId, referenceType,
	 * and linkNumber
	 */
	function modifyElementVisibility(
		referenceId,
		referenceType,
		linkNumber,
		visible
	) {
		var element = null;
		if (linkNumber !== null && linkNumber !== undefined) {
			element = document.getElementById(
				`reference-list-popup-${referenceType}-${referenceId}-${linkNumber}`
			);
		} else {
			element = document.getElementById(
				`reference-list-popup-${referenceType}-${referenceId}`
			);
		}
		if (visible) {
			element.style.display = "block";
		} else {
			element.style.display = "none";
		}
	}

	/**
	 * Handles actual editing of element in table by finding
	 * it based on where the click event occurred. Constructs
	 * a textarea element in place of the clicked element to
	 * enable editing of the contents, and returns this textarea
	 * element along with relevant fields needed to find it in
	 * subsequent function calls
	 */
	function editReferencesHandler(ev) {
		// Determine what element the click happened on
		// using event.clientX and event.clientY
		var clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);

		// If we selected a <td> element, go down to the first child <p>
		// element of that <td>. Otherise, if we clicked a text area that
		// was already created for the relevant <p>, we should return early.
		if (clickedElement.nodeName === "TD") {
			clickedElement = clickedElement.firstElementChild;
		} else if (clickedElement.nodeName === "TEXTAREA") {
			// We don't want to add more than one input per element
			// clicked, so return early if the same region is clicked
			// twice in a row.
			return null;
		}

		// Save the text of the <p>
		var referenceText = clickedElement.innerText;

		// Use the ID of the clicked element in order
		// to determine the ID of the reference element
		// in localStorage associated with it. Idea here
		// is to split the ID on "-" character, then
		// use the length of the result to determine if we're
		// working with a title or a link part of the table
		var idParts = clickedElement.id.split("-");
		var referenceId,
			linkNumber,
			referenceType = null;
		// Working with a title
		if (idParts.length === 5) {
			referenceId = Number.parseInt(idParts[idParts.length - 1]);
			referenceType = idParts[idParts.length - 2];
		} else {
			// Working with a link
			linkNumber = idParts[idParts.length - 1];
			referenceId = Number.parseInt(idParts[idParts.length - 2]);
			referenceType = idParts[idParts.length - 3];
		}
		// This means we've already created a textarea input element in the
		// <div> somewhere, and we only want to allow one edit area at a time,
		// so we'll return early.
		if (
			document.querySelectorAll("textarea[id^=reference-item-input-").length > 0
		) {
			return null;
		}
		// Hide the <p> and show an <textarea> temporarily
		// so we can edit the <textarea>
		var editInput = document.createElement("textarea");
		editInput.cols = DEFAULT_TEXTAREA_COLS;
		editInput.rows = DEFAULT_TEXTAREA_ROWS;
		editInput.id = `reference-item-input-${referenceType}-${referenceId}`;
		editInput.placeholder = `${referenceText}`;
		editInput.value = `${referenceText}`;
		editInput.style.paddingRight = "3px";
		editInput.style.display = "block";
		clickedElement.parentElement.appendChild(editInput);
		clickedElement.style.display = "none";
		return [editInput, referenceId, referenceType, linkNumber];
	}

	/**
	 * Handles updating the relevant reference in localStorage
	 * and paragraph element after the user has finished updating the
	 * textarea.
	 */
	function editReferencesInputChangeHandler(
		referenceId,
		referenceType,
		linkNumber,
		newTextValue
	) {
		// Get the reference using the ID and update its text using
		// the referenceId, then update this in localStorage
		var references = JSON.parse(localStorage.getItem(getBaseURI()));
		var matchingRefs = references.filter((ref) => ref["id"] === referenceId);
		var refToUpdate = matchingRefs[0];
		var refIndex = references.indexOf(refToUpdate);
		if (referenceType === "title") {
			// Update title
			refToUpdate.text = newTextValue;
		} else {
			// Update this specific link
			refToUpdate.links[linkNumber] = newTextValue;
		}
		// references = references.splice(refIndex, 1, refToUpdate);
		localStorage.setItem(getBaseURI(), JSON.stringify(references));
		// Find the <p> element and update the text inside of it,
		// then redisplay it
		var pElement = null;
		if (linkNumber !== null && linkNumber !== undefined) {
			// Working with a link
			pElement = document.getElementById(
				`reference-list-popup-${referenceType}-${referenceId}-${linkNumber}`
			);
		} else {
			pElement = document.getElementById(
				`reference-list-popup-${referenceType}-${referenceId}`
			);
		}
		pElement.innerText = newTextValue;
		// Remove the <textarea> element from the DOM, then
		// redisplay the <p> element
		var inputElement = document.getElementById(
			`reference-item-input-${referenceType}-${referenceId}`
		);
		inputElement.parentElement.removeChild(inputElement);

		pElement.style.display = "block";
	}

	/**
	 * Removes the <div> created by "Display References"
	 */
	function removeDisplayedReferences(referenceListPopup) {
		referenceListPopup.parentElement.removeChild(referenceListPopup);
	}

	/**
	 * Generates a scrollable popup that displays the references,
	 * if there are any. Format of the popup is a table, with two columns,
	 * "Title" and "Links"
	 */
	function displayReferences() {
		var refString = localStorage.getItem(getBaseURI());
		var refs = JSON.parse(refString);
		// Figure out position to add <div> to document body
		// We'll add right at the centermost element in the
		// document so that the user will see it
		var quarterX = document.documentElement.clientWidth / 4;
		var centerY = document.documentElement.clientHeight / 2;
		var centerElement = document.elementFromPoint(quarterX, centerY);
		// We want to ensure the <div> won't be embedded in an <a> tag
		var possibleAnchorPredecessor = findParentNode(centerElement, "A");
		if (possibleAnchorPredecessor !== null) {
			centerElement = possibleAnchorPredecessor;
		}

		// Add Font-Awesome styles to document.head for rendering
		// buttons on the <div>
		var link = document.createElement("link");
		link.href =
			"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/css/all.min.css";
		link.rel = "stylesheet";
		link.type = "text/css";
		document.head.appendChild(link);

		// Create div to add to document body
		var refListPopup = document.createElement("div", {
			id: "reference-list-popup",
		});

		// Create <div> for buttons that'll be on the popup
		var displayRefOptions = document.createElement("div");
		displayRefOptions.style.textAlign = "right";
		var downloadButton = document.createElement("button");
		downloadButton.innerHTML = '<i class="fa fa-download"></i>';
		downloadButton.onclick = () => {
			disableEditReferences();
			downloadReferences();
		};
		var editButton = document.createElement("button");
		editButton.id = "reference-list-edit-button";
		editButton.innerHTML =
			'<i id="reference-list-edit-icon" class="fa fa-edit"></i>';
		editButton.onclick = () => {
			enableEditReferences();
		};
		var closeButton = document.createElement("button");
		closeButton.innerHTML = '<i class="fa fa-times"></i>';
		closeButton.onclick = () => {
			removeDisplayedReferences(refListPopup);
		};
		displayRefOptions.appendChild(downloadButton);
		displayRefOptions.appendChild(editButton);
		displayRefOptions.appendChild(closeButton);
		refListPopup.appendChild(displayRefOptions);

		refListPopup.style.overflow = "hidden";
		refListPopup.style.overflowY = "auto";
		refListPopup.style.overflowX = "auto";
		refListPopup.style.background = "aquamarine none repeat scroll";
		refListPopup.style.boxShadow = "0 0 10px black";
		refListPopup.style.borderRadius = "10px";
		refListPopup.style.position = "absolute";
		refListPopup.style.zIndex = 9999;
		refListPopup.style.padding = "10px";
		refListPopup.style.textAlign = "left";
		refListPopup.style.display = "block";
		var table = document.createElement("table");
		table.id = "reference-list-popup-table";
		length = refs.length;
		for (var i = 0; i < length; i++) {
			var tr = document.createElement("tr");

			// Title formatting
			var td1 = document.createElement("td");
			td1.style.textAlign = "left";
			td1.style.fontWeight = "bold";
			td1.style.fontStyle = "italic";
			var text1 = document.createElement("p");
			text1.innerText = refs[i].text;
			text1.id = `reference-list-popup-title-${refs[i].id}`;
			var numLinks = refs[i].links.length;

			// Links formatting
			var td2 = document.createElement("td");
			var text2 = null;
			if (numLinks > 0) {
				for (var j = 0; j < numLinks; j++) {
					text2 = document.createElement("p");
					text2.innerText = `${j + 1}: `;
					text2.id = `reference-list-popup-link-${refs[i].id}-${j}`;
					url = document.createElement("a");
					url.href = refs[i].links[j];
					url.innerText = refs[i].links[j];
					text2.appendChild(url);
					td2.appendChild(text2);
				}
			} else {
				text2 = document.createElement("p");
				text2.innerText = "No references! 🥺";
				text2.id = `reference-list-popup-link-${refs[i].id}-0`;
				td2.appendChild(text2);
			}

			td1.appendChild(text1);
			tr.appendChild(td1);
			tr.appendChild(td2);

			table.appendChild(tr);
		}
		refListPopup.appendChild(table);

		if (centerElement.nextElementSibling !== null) {
			centerElement.parentElement.insertBefore(
				refListPopup,
				centerElement.nextElementSibling
			);
		} else {
			centerElement.parentElement.insertBefore(refListPopup, centerElement);
		}
	}

	/**
	 * Prepares reference data for later download.
	 * Content script can't download directly, but it can prepare
	 * the data and send it to the background script so that it
	 * can download the file
	 */
	async function downloadReferences() {
		// Get references out of localStorage
		var references = localStorage.getItem(getBaseURI());

		// Construct filename
		var splitLowercaseURI = getBaseURI().toLowerCase().split("/");
		var endPart = splitLowercaseURI[splitLowercaseURI.length - 1];
		var filename = `${endPart}.json`;

		const { response, objectURL } = await browser.runtime.sendMessage({
			type: DOWNLOAD,
			data: { references, filename },
		});
		// Revoke object URL of file after download completes
		URL.revokeObjectURL(objectURL);
	}

	/**
	 * Removes references that are present on the current page
	 * from localStorage.
	 */
	function deleteReferences() {
		localStorage.removeItem(getBaseURI());
		// Update display status of Delete References
		// option so it'll be hidden when references have
		// been deleted from localStorage. We'll listen
		// for the storage.local.onChanged event in the
		// background script and update styling of the
		// popup appropriately
		var deleteRefsHidden = {};
		deleteRefsHidden[tabURL] = { hidden: true };
		browser.storage.local.set(deleteRefsHidden);
	}

	/**
	 * Changes cursor to pointer and adds event listener to
	 * document body to selection of reference sections.
	 */
	function selectReferences() {
		// Steps:
		// 1. Change style of cursor to a pointer
		document.body.style.cursor = "pointer";
		// 2. When user holds down cursor/mouse at a particular point,
		// highlight the underlying DOM elements that point is pointing
		// to. How? Add click handler to body (to encompass all relevant divs)
		document.body.addEventListener("click", modifySelectedRegionStyles, true);
	}

	/**
	 * Modifies region selected by a user by highlighting it
	 * with a lightblue background and a solid black border
	 * around it.
	 */
	prevSelection = null;
	function modifySelectedRegionStyles(ev) {
		// Won't always look at the true event.target when
		// comparing prevSelection to next. Instead, recurse
		// up, set prevSelection to <li> containing the actual
		// event.target, then do comparison and/or highlighting.
		// This will make it easier to highlight the
		// entire <ol> or <ul> when/if needed.
		var elementContainingTarget = findParentNode(ev.target, "LI");
		if (prevSelection != null) {
			removeStyles(prevSelection);
			removeRefSelectionOptions(prevSelection);
		}

		insertStyles(elementContainingTarget);
		insertRefSelectionOptions(elementContainingTarget);
		prevSelection = elementContainingTarget;
	}

	/**
	 * Highlights element with lightblue background
	 * and solid black border around it.
	 */
	function insertStyles(element) {
		element.style.backgroundColor = "lightblue";
		element.style.borderStyle = "solid";
	}

	/**
	 * Removes styling from element that was
	 * previously styled with the selection region
	 * styling.
	 */
	function removeStyles(element) {
		element.style.backgroundColor = "";
		element.style.borderStyle = "";
	}

	/**
	 * Adds a styled div to the highlighted region that enables you to
	 * confirm, expand, or cancel selection
	 */
	function insertRefSelectionOptions(element) {
		// Thank you, Stack Overflow:
		// 		https://stackoverflow.com/a/494348/8782284
		var div = document.createElement("div");
		var htmlString =
			'<div id="ref-select-div" style="display: block"><button id="ref-select-extraction" style="background-color: lightgreen; border-radius: 10%">&check;</button><button id="ref-select-expansion" style="background-color: lightskyblue; border-radius: 10%">Expand Selection</button><button id="ref-select-cancel" style="background-color: crimson; border-radius: 10%">&#10005;</button></div>';
		div.innerHTML = htmlString.trim();
		var refSelectDiv = div.firstElementChild;
		element.appendChild(refSelectDiv);

		// Extract references when check is clicked
		var checkButton = document.getElementById("ref-select-extraction");
		checkButton.addEventListener(
			"click",
			(ev) => {
				// Remove styles and refSelectionOptions from the
				// element that the selection options div is a child
				// of, and extract references. This should be
				// one of <li>, <ul>, or <ol>
				removeStyles(element);
				removeRefSelectionOptions(element);
				extractReferencesFromSelection(element);
				exitSelectionMode();
			},
			false
		);

		// Expand selection to parent element whenever "Expand Selection" is clicked
		var expandButton = document.getElementById("ref-select-expansion");
		expandButton.addEventListener(
			"click",
			(ev) => {
				// Remove styling from currently selected element, then...
				removeStyles(element);
				removeRefSelectionOptions(element);
				// Expand selection to the parent element, then...
				var parentElement = expandSelection(element);
				// Insert selection options underneath this parent element, then...
				insertRefSelectionOptions(parentElement);
				// Update prevSelection to be the new parentElement, and finally...
				prevSelection = parentElement;
				// Exit selection mode
				exitSelectionMode();
			},
			true
		);

		// Cancel Selection whenever "X" is clicked
		var cancelButton = document.getElementById("ref-select-cancel");
		cancelButton.addEventListener(
			"click",
			(ev) => {
				removeStyles(element);
				removeRefSelectionOptions(element);
				exitSelectionMode();
			},
			false
		);
	}

	/**
	 * Exits selection mode by removing the event listener from
	 * document.body and switching the style of the cursor back
	 * to the default style.
	 */
	function exitSelectionMode() {
		document.body.style.cursor = "default";
		document.body.removeEventListener(
			"click",
			modifySelectedRegionStyles,
			true
		);
	}

	/**
	 * Removes reference selection div that was attached to the element
	 * as the last element child using the ID of the div.
	 */
	function removeRefSelectionOptions(element) {
		var selectionDiv = document.getElementById("ref-select-div");
		if (selectionDiv !== null) {
			element.removeChild(selectionDiv);
		}
	}

	/**
	 * Expands currently selected region to encompass
	 * parent element of the element passed in
	 */
	function expandSelection(element) {
		var parent = element.parentElement;
		insertStyles(parent);
		return parent;
	}

	/**
	 * Recursively search up parent elemnet tree of a
	 * given element until an element with nodename
	 * equal to the desired value is found.
	 */
	function findParentNode(element, nodeName) {
		if (element === null || element.nodeName === nodeName) {
			return element;
		} else {
			return findParentNode(element.parentElement, nodeName);
		}
	}

	// Tab URL for use with storing in
	// storage.local with hidden information
	var tabURL = null;
	/**
	 * Listen for messages from the background script and
	 * call the appropriate functions based on the message.
	 */
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		tabURL = getBaseURI();
		if (message.command === "extractRefs") {
			extractReferencesFromSelection(null);
		} else if (message.command === "displayRefs") {
			displayReferences();
		} else if (message.command === "downloadRefs") {
			downloadReferences();
		} else if (message.command === "deleteRefs") {
			deleteReferences();
		} else if (message.command === "selectRefs") {
			selectReferences();
		}
	});
})();
