/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
	document.addEventListener("click", (e) => {
		/**
		 * Send an "extractRefs" message to the content script in the active tab.
		 */
		function extractReferences(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "extractRefs",
			});
		}
		/**
		 * Send an "extractRefs" message to the content script in the active tab.
		 */
		function listReferences(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "listRefs",
			});
		}

		/**
		 * Send a "selectRefs" message to the content script in the active tab.
		 */
		function selectReferences(tabs) {
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
				.then(extractReferences)
				.catch(reportError);
		} else if (e.target.classList.contains("list-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(listReferences)
				.catch(reportError);
		} else if (e.target.classList.contains("select-refs")) {
			browser.tabs
				.query({ active: true, currentWindow: true })
				.then(selectReferences)
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
