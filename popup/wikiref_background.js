/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
	// Start by styling the "Delete References" <div> appropriately
	// based on the value of the "hidden" key in storage.local for
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
			var deleteRefsDiv = document.querySelector(".delete-refs");
			var tabURL = Object.keys(tabData)[0];
			if (tabData[tabURL] !== undefined) {
				if (tabData[tabURL]["hidden"] === true) {
					deleteRefsDiv.classList.add("hidden");
				} else {
					deleteRefsDiv.classList.remove("hidden");
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
			console.log(`Could not invoke WikiRef: ${error}`);
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

/**
 * Gets base URI by trimming extra characters that might
 * indicate an article heading.
 */
function getBaseURI(uri) {
	return uri.split("#")[0];
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
	document.querySelector("#wikiref-options").classList.add("hidden");
	document.querySelector("#error-content").classList.remove("hidden");
	console.log(`Failed to execute wikiref content script: ${error.message}`);
}

/**
 * Downloads references locally in the form of a JSON file
 */
function downloadReferences(references, filename) {
	console.log("About to download these references! JSON is: ", references);

	// Create file, then object URL, and download using that
	// object URL
	var file = new File([references], filename, {
		type: "application/json",
	});
	var exportURL = URL.createObjectURL(file);
	console.log("Export URL is: ", exportURL);
	return browser.downloads
		.download({
			url: exportURL,
			filename: filename,
			saveAs: false,
		})
		.then(
			(downloadId) => {
				return Promise.resolve([downloadId, exportURL]);
			},
			(reason) => {
				return Promise.reject([reason, exportURL]);
			}
		);
}

function handleMessage(request, sender, sendResponse) {
	console.log(`Received message from content script! Request was: ${request}`);
	const { type, data } = request;
	if (type === "downloadMessage") {
		const { references, filename } = data;
		downloadReferences(references, filename).then(
			(value) => {
				var [downloadId, exportURL] = value;

				return sendResponse({
					response: `Success! Download ID was ${downloadId}.`,
					objectURL: `Export URL was: ${exportURL}`,
				});
			},
			(error) => {
				var [reason, exportURL] = error;
				console.log(`Error was: ${reason}`);
				return sendResponse({
					response: `Error! Reason was: ${reason}.`,
					objectURL: `Export URL was: ${exportURL}`,
				});
			}
		);
	}
	return true;
}
browser.runtime.onMessage.addListener(handleMessage);

function handleStorageChange(changes, areaName) {
	console.log("Changes object is: ", changes);
	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => {
			return getBaseURI(tabs[0].url);
		})
		.then((tabURL) => {
			return browser.storage.local.get(tabURL);
		})
		.then((tabData) => {
			var deleteRefsDiv = document.querySelector(".delete-refs");
			var tabURL = Object.keys(tabData)[0];
			if (tabData[tabURL] !== undefined) {
				if (changes["hidden"].newValue === true) {
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
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs
	.executeScript({ file: "/wikiref.js" })
	.then(listenForClicks)
	.catch(reportExecuteScriptError, () => {
		console.log("The script failed to execute!");
	});
