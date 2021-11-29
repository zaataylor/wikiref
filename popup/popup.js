/**
 * Gets base URI by trimming extra characters that might
 * indicate an article heading.
 */
function getBaseURI(uri) {
	return uri.split("#")[0];
}

/**
 * Listen for clicks on the popup's buttons, and
 * send the appropriate message to the content
 * script in the page.
 */
function listenForClicks() {
	// Start by styling the "Select References" and
	// "Delete References" <div>s appropriately
	// based on the value of keys in storage.local for
	// the currently active tab
	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => {
			return getBaseURI(tabs[0].url);
		})
		.then((tabURL) => {
			return browser.storage.local.get(tabURL);
		})
		.then((tabData) => {
			var tabURL = Object.keys(tabData)[0];
			if (tabData[tabURL] !== undefined) {
				// Check for status of Select Mode variable
				if (tabData[tabURL]["selectModeActive"] !== undefined) {
					var selectRefsDivs = document.querySelector(".select-refs");
					if (tabData[tabURL]["selectModeActive"] === true) {
						console.log(
							"selectModeActive is: ",
							tabData[tabURL]["selectModeActive"]
						);

						selectRefsDivs.innerText = "In Select Mode";
					} else {
						console.log(
							"selectModeActive innerText is: ",
							tabData[tabURL]["selectModeActive"]
						);
						selectRefsDivs.innerText = "Select References";
					}
					console.log(
						"selectRefsDivs innerText is: ",
						selectRefsDivs.innerText
					);
				}

				// Check for status of Delete References variable
				if (tabData[tabURL]["hidden"] !== undefined) {
					var deleteRefsDiv = document.querySelector(".delete-refs");
					if (tabData[tabURL]["hidden"] === true) {
						deleteRefsDiv.classList.add("hidden");
					} else {
						// <div> should no longer be hidden
						deleteRefsDiv.classList.remove("hidden");
					}
				}
			}
		});

	document.addEventListener("click", (e) => {
		/**
		 * Send an "extractRefs" message to the content script in the active tab.
		 */
		function sendExtractReferencesMessage(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "extractRefs",
			});
		}
		/**
		 * Send a "displayRefs" message to the content script in the active tab.
		 */
		function sendDisplayReferencesMessage(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "displayRefs",
			});
		}

		/**
		 * Send a "downloadRefs" message to the content script in the active tab.
		 */
		function sendDownloadReferencesMessage(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "downloadRefs",
			});
		}

		/**
		 * Send a "deleteRefs" message to the content script in the active tab.
		 */
		function sendDeleteReferencesMessage(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "deleteRefs",
			});
		}

		/**
		 * Send a "selectRefs" message to the content script in the active tab.
		 */
		function sendSelectReferencesMessage(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "selectRefs",
			});
		}

		/**
		 * Just log the error to the console.
		 */
		function reportError(error) {
			console.error(`Could not invoke WikiRef: ${error}`);
		}

		/**
		 * Get the active tab,
		 * then call "extractReferences", "listReferences", or
		 * "selectReferences" as appropriate.
		 */
		if (e.target.classList.contains("extract-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendExtractReferencesMessage)
				.catch(reportError);
		} else if (e.target.classList.contains("display-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendDisplayReferencesMessage)
				.catch(reportError);
		} else if (e.target.classList.contains("download-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendDownloadReferencesMessage)
				.catch(reportError);
		} else if (e.target.classList.contains("delete-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendDeleteReferencesMessage)
				.catch(reportError);
		} else if (e.target.classList.contains("select-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendSelectReferencesMessage)
				.catch(reportError);
		}
	});
}

function handleStorageChange(changes, areaName) {
	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => {
			return getBaseURI(tabs[0].url);
		})
		.then((tabURL) => {
			return browser.storage.local.get(tabURL);
		})
		.then((tabData) => {
			console.log("Changes object is: ", changes);
			var tabURL = Object.keys(tabData)[0];
			var tabChanges = changes[tabURL];
			console.log("Changes on this tab are: ", tabChanges);
			if (tabData[tabURL] !== undefined) {
				// Check for changes to Select Mode status
				var selectRefsDivs = document.querySelector(".select-refs");
				if (tabChanges.newValue["selectModeActive"] === true) {
					selectRefsDivs.innerText = "In Select Mode";
				} else {
					selectRefsDivs.innerText = "Select References";
				}

				// Check for changes to Delete References action
				var deleteRefsDiv = document.querySelector(".delete-refs");
				if (tabChanges.newValue["hidden"] === true) {
					deleteRefsDiv.classList.add("hidden");
				} else {
					// <div> should no longer be hidden
					deleteRefsDiv.classList.remove("hidden");
				}
			}
		});
}
browser.storage.onChanged.addListener(handleStorageChange);

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
	document.querySelector("#wikiref-options").classList.add("hidden");
	document.querySelector("#error-content").classList.remove("hidden");
	console.error(`Failed to execute wikiref content script: ${error.message}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs
	.executeScript({ file: "/wikiref.js" })
	.then(listenForClicks)
	.catch(reportExecuteScriptError, () => {
		console.error("The script failed to execute!");
	});
