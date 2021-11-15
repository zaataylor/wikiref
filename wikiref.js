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

	function extractReferences(selection) {
		// Looking for element with class="references"
		console.log("Selection is: ", selection);
		var referenceList =
			selection !== null
				? selection.getElementsByClassName("references")
				: document.getElementsByClassName("references");
		var references = [];
		if (referenceList.length > 0) {
			// Idea: Last element of this type will be actual References
			// section since these are the bottommost part of the page
			var refList = referenceList[referenceList.length - 1];
			// console.log("Reference List is: ", refList);
			var children = refList.children;

			for (var i = 0; i < children.length; i++) {
				// console.log("Child innerText is: ", children[i].innerText);
				// console.log("Child Element is: ", children[i]);
				// Get reference text <span> element. It may or may not contain external
				// links that we should keep track of
				var ref = {
					id: i,
					text: "",
					links: [],
				};
				var referenceTextSpan =
					children[i].getElementsByClassName("reference-text")[0];
				ref.text = referenceTextSpan.innerText;
				// console.log(
				// 	"Reference Text Span Contains: ",
				// 	referenceTextSpan.innerText
				// );
				var a_children = referenceTextSpan.getElementsByTagName("a");
				// console.log("<a> Children are: ", a_children);
				for (var k = 0; k < a_children.length; k++) {
					// extract the links that are external references only for now
					if (
						a_children[k].classList.contains("external") &&
						a_children[k].rel === "nofollow"
					) {
						ref.links.push(a_children[k].href);
					}
				}
				// console.log("Ref is: ", ref);
				references.push(ref);
			}
		}
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
		console.log("REFS is: ", refs);
		console.log("1.");
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
			console.log("Added row: ", tr);
		}
		refListPopup.appendChild(table);

		document.body.appendChild(refListPopup);
		console.log("References are: ", refs);
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
		// to. How?
		//      Add click handler to body (to encompass all relevant divs)
		document.body.addEventListener("click", modifySelectedRegionStyles, false);
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
		if (prevSelection != null) {
			// Same element clicked twice
			if (prevSelection.textContent == elementContainingTarget.textContent) {
				// 3. Once user clicks again on the DOM element,
				//      extract the references from that DOM element
				extractReferences(elementContainingTarget);
				// 4. Finally, revert the cursor to its original form andd
				// remove all highlighting
				document.body.style.cursor = "default";
				elementContainingTarget.style.backgroundColor = "";
				elementContainingTarget.style.borderStyle = "";
				// Remove listener now
				document.body.removeEventListener("click", modifySelectedRegionStyles);
				// Return early and reset sentinel to prevent the
				//  styling from being reverted
				prevSelection = null;
				return;
			} else {
				// Let's remove the styling on the previously clicked
				// element since we clicked off of it
				prevSelection.style.backgroundColor = "";
				prevSelection.style.borderStyle = "";
			}
		}
		prevSelection = elementContainingTarget;
		// When click happens, get event.target, which should point to the
		// location of the innermost element where you actually clicked
		elementContainingTarget.style.backgroundColor = "lightblue";
		elementContainingTarget.style.borderStyle = "solid";
	}

	/**
	 * Recursively search up parent element tree of a
	 * given element until a list item element (i.e. an
	 * element with nodename "LI") is found.
	 */
	function findListItem(element) {
		console.log("Current element in recursion is: ", element);
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
			console.log("About to extract references!");
			extractReferences(null);
		} else if (message.command === "listRefs") {
			console.log("About to display references!");
			listReferences();
		} else if (message.command === "selectRefs") {
			console.log("About to select references!");
			selectReferences();
		}
	});
})();
