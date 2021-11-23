/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
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
		 * Send an "extractRefs" message to the content script in the active tab.
		 */
		function sendListReferencesMessage(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "listRefs",
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
		} else if (e.target.classList.contains("list-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendListReferencesMessage)
				.catch(reportError);
		} else if (e.target.classList.contains("download-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(sendDownloadReferencesMessage)
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

browser.runtime.onMessage.addListener(handleMessage);

function handleMessage(request, sender, sendResponse) {
	console.log(`Received message from content script! Request was: ${request}`);
	const { type, data } = request;
	if (type === "downloadMessage") {
		const { references, filename } = data;
		downloadReferences(references, filename).then(
			(value) => {
				var [downloadId, exportURL] = value;
				console.log(`Value from returned promise was: ${downloadId}`);
				// Now, revoke the exportURL
				return sendResponse({
					response: `Success! Download ID was ${downloadId}.`,
					objectURL: `Export URL was: ${exportURL}`,
				});
			},
			(error) => {
				var [reason, exportURL] = error;
				console.log(`Error was: ${reason}`);
				// Now, revoke the exportURL
				return sendResponse({
					response: `Error! Reason was: ${reason}.`,
					objectURL: `Export URL was: ${exportURL}`,
				});
			}
		);
		return true;
	}
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
		console.log("The script failed to execute!");
	});
