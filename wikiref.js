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

	function extractReference(child, index) {
		console.log("Child is: ", child);
		var ref = {
			id: index,
			text: "",
			links: [],
		};
		// Try to get reference text <span> element. It may
		// or may not contain external inks that we should keep track of
		var referenceTextSpan = child.getElementsByClassName("reference-text")[0];
		ref.text = referenceTextSpan.innerText;
		var a_children = referenceTextSpan.getElementsByTagName("a");
		for (var k = 0; k < a_children.length; k++) {
			// Extract the links that are external references only for now
			if (
				a_children[k].classList.contains("external") &&
				a_children[k].rel === "nofollow"
			) {
				ref.links.push(a_children[k].href);
			}
		}
		console.log("About to return ref: ", ref);
		return ref;
	}

	function extractReferencesFromSelection(selection) {
		// TODO: Update this logic to make it more generic
		console.log("Selection is: ", selection);
		var references = [];
		// Need to differentiate a few different cases
		if (selection === null) {
			console.log("Selection is null!");
			//	1. element is "null" -> try to auto-extract using heuristic of finding
			//		last element with class "references" in document
			var referenceElements = document.getElementsByClassName("references");
			var referenceList = referenceElements[referenceElements.length - 1];
			var children = referenceList.children;
			if (children.length > 0) {
				for (var i = 0; i < children.length; i++) {
					references.push(extractReference(children[i], i));
				}
			}
		} else if (selection.nodeName === "LI") {
			//	2. element.nodeName is "LI" -> extract refs from list item and update
			//		localStorage appropriately
			references.push(extractReference(selection, 0));
		} else if (selection.nodeName === "UL" || selection.nodeName === "OL") {
			console.log("Selection is of type: ", selection.nodeName);
			//	3. element.nodeName is "UL" or "OL" -> extract refs from list of refs
			//		and update localStorage appropriately
			var children = selection.children;
			if (children.length > 0) {
				for (var i = 0; i < children.length; i++) {
					references.push(extractReference(children[i], i));
				}
			}
		}
		// var referenceList =
		// 	selection !== null
		// 		? selection.getElementsByClassName("references")
		// 		: document.getElementsByClassName("references");
		// var references = [];
		// if (referenceList.length > 0) {
		// 	// Idea: Last element of this type will be actual References
		// 	// section since these are the bottommost part of the page
		// 	var refList = referenceList[referenceList.length - 1];
		// 	// console.log("Reference List is: ", refList);
		// 	var children = refList.children;

		// 	for (var i = 0; i < children.length; i++) {
		// 		// console.log("Child innerText is: ", children[i].innerText);
		// 		// console.log("Child Element is: ", children[i]);
		// 		// Get reference text <span> element. It may or may not contain external
		// 		// links that we should keep track of
		// 		var ref = {
		// 			id: i,
		// 			text: "",
		// 			links: [],
		// 		};
		// 		var referenceTextSpan =
		// 			children[i].getElementsByClassName("reference-text")[0];
		// 		ref.text = referenceTextSpan.innerText;
		// 		// console.log(
		// 		// 	"Reference Text Span Contains: ",
		// 		// 	referenceTextSpan.innerText
		// 		// );
		// 		var a_children = referenceTextSpan.getElementsByTagName("a");
		// 		// console.log("<a> Children are: ", a_children);
		// 		for (var k = 0; k < a_children.length; k++) {
		// 			// extract the links that are external references only for now
		// 			if (
		// 				a_children[k].classList.contains("external") &&
		// 				a_children[k].rel === "nofollow"
		// 			) {
		// 				ref.links.push(a_children[k].href);
		// 			}
		// 		}
		// 		// console.log("Ref is: ", ref);
		// 		references.push(ref);
		// 	}
		// }
		// Set these in local storage
		localStorage.setItem(document.baseURI, JSON.stringify(references));
		console.log("Successfully copied the references! Refs are: ", references);
	}

	/**
	 * Generates a scrollable popup that lists the references,
	 * if there are any. Format of the popup is a table, with two columns,
	 * "Title" and "Links"
	 */
	function listReferences() {
		var refString = localStorage.getItem(document.baseURI);
		var refs = JSON.parse(refString);
		// Create div to add to document body
		var refListPopup = document.createElement("div", {
			id: "reference-list-popup",
		});
		refListPopup.style.width = "80%";
		refListPopup.style.height = "80%";
		refListPopup.style.overflow = "hidden";
		refListPopup.style.overflowY = "auto";
		refListPopup.style.overflowX = "auto";
		refListPopup.style.background = "aquamarine";
		refListPopup.style.boxShadow = "0 0 10px black";
		refListPopup.style.borderRadius = "10px";
		refListPopup.style.position = "absolute";
		refListPopup.style.top = "50%";
		refListPopup.style.left = "50%";
		refListPopup.style.transform = "translate(-50%, -50%)";
		refListPopup.style.zIndex = 9999;
		refListPopup.style.padding = "10px";
		refListPopup.style.textAlign = "left";
		refListPopup.style.display = "block";

		var table = document.createElement("table");
		length = refs.length;
		for (var i = 0; i < length; i++) {
			var tr = document.createElement("tr");

			var td1 = document.createElement("td");
			td1.style.textAlign = "center";
			td1.style.fontWeight = "bold";
			td1.style.fontStyle = "italic";

			var td2 = document.createElement("td");

			var text1 = document.createTextNode(refs[i].text);
			var numLinks = refs[i].links.length;

			var text2 = null;
			if (numLinks > 0) {
				for (var j = 0; j < numLinks; j++) {
					text2 = document.createElement("p");
					text2.innerText = `${j + 1}: `;
					url = document.createElement("a");
					url.href = refs[i].links[j];
					url.innerText = refs[i].links[j];
					text2.appendChild(url);
					td2.appendChild(text2);
				}
			} else {
				text2 = document.createTextNode("No references! 🥺");
				td2.appendChild(text2);
			}

			td1.appendChild(text1);
			tr.appendChild(td1);
			tr.appendChild(td2);

			table.appendChild(tr);
		}
		refListPopup.appendChild(table);

		document.body.appendChild(refListPopup);
	}

	/**
	 * Helper function that returns a string containing information
	 * on a list of links
	 */
	function displayLinks(links) {
		if (links.length == 0) {
			return "No references here!";
		}
		result = "";
		for (var i = 0; i < links.length; i++) {
			result += `${i + 1}: ${links[i]}`;
		}
		return result;
	}

	function selectReferences() {
		// Steps:
		// 1. Change style of cursor to a pointer
		document.body.style.cursor = "pointer";
		// 2. When user holds down cursor/mouse at a particular point,
		// highlight the underlying DOM elements that point is pointing
		// to. How? Add click handler to body (to encompass all relevant divs)
		document.body.addEventListener("click", modifySelectedRegionStyles, true);
	}

	prevSelection = null;
	function modifySelectedRegionStyles(ev) {
		console.log("Event target was: ", ev.target);
		console.log("Previous selection is now: ", prevSelection);

		// Won't always look at the true event.target when
		// comparing prevSelection to next. Instead, recurse
		// up, set prevSelection to <li> containing the actual
		// event.target, then do comparison and/or highlighting.
		// This will make it easier to highlight the
		// entire <ol> or <ul> when/if needed.
		var elementContainingTarget = findListItem(ev.target);
		console.log("Event target is contained by: ", elementContainingTarget);
		if (prevSelection != null) {
			removeStyles(prevSelection);
			removeRefSelectionOptions(prevSelection);
		}

		insertStyles(elementContainingTarget);
		insertRefSelectionOptions(elementContainingTarget);
		prevSelection = elementContainingTarget;
	}

	function insertStyles(element) {
		element.style.backgroundColor = "lightblue";
		element.style.borderStyle = "solid";
	}

	function removeStyles(element) {
		element.style.backgroundColor = "";
		element.style.borderStyle = "";
	}

	/**
	 * Adds a styled div to the highlighted region that enables you to
	 * confirm, expand, or cancel selection
	 */
	function insertRefSelectionOptions(element) {
		var lastChild = element.lastElementChild;
		lastChild.insertAdjacentHTML(
			"afterend",
			'<div id="ref-select-div" style="display: block"><button id="ref-select-extraction" style="background-color: green; border-radius: 10%">&check;</button><button id="ref-select-expansion" style="background-color: lightskyblue; border-radius: 10%">Expand Selection</button><button id="ref-select-cancel" style="background-color: red; border-radius: 10%">&#10005;</button></div>'
		);

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
				// Update prevSelection to be the new parentElement
				prevSelection = parentElement;
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
				prevSelection = null;
				document.body.style.cursor = "default";
				document.body.removeEventListener("click", modifySelectedRegionStyles);
			},
			false
		);
	}

	function removeRefSelectionOptions(element) {
		element.removeChild(element.lastElementChild);
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
	 * Recursively search up parent element tree of a
	 * given element until a list item element (i.e. an
	 * element with nodename "LI") is found.
	 */
	function findListItem(element) {
		if (element.nodeName === "LI") {
			return element;
		} else {
			return findListItem(element.parentElement);
		}
	}

	/**
	 * Listen for messages from the background script and
	 * call the appropriate functions based on the message.
	 */
	browser.runtime.onMessage.addListener((message) => {
		if (message.command === "extractRefs") {
			extractReferencesFromSelection(null);
		} else if (message.command === "listRefs") {
			listReferences();
		} else if (message.command === "selectRefs") {
			selectReferences();
		}
	});
})();
