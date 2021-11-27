/**
 * Gets base URI by trimming extra characters that might
 * indicate an article heading.
 */
function getBaseURI(uri) {
	return uri.split("#")[0];
}

/**
 * Downloads references locally in the form of a JSON file
 */
function downloadReferences(references, filename) {
	// Create file, then object URL, and download using that
	// object URL
	var file = new File([references], filename, {
		type: "application/json",
	});
	var exportURL = URL.createObjectURL(file);
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
