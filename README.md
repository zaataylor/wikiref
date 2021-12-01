<a href="https://project-types.github.io/#toy"><img src="https://img.shields.io/badge/project%20type-toy-blue" alt="Toy Badge"/></a>

![Wikiref Logo](icons/wikiref-48.png)

# Description

Wikipedia, the world's online encyclopedia, is a useful, curated source of information. Often, however, it's said that one of the most value parts of any given Wikipedia article are not the user-contributed topic explanations, but the references and external links from which those explanations are based.

Wikiref aims to make the process of extracting these sources for later review or analysis dead simple. It operates as a Firefox (and soon to be Chrome!) browser extension that is only active when you're on a Wikipedia page.

- [Installation](#installation)
- [How to Use It](#how-to-use-it)
  - [Selecting References](#selecting-references)
  - [Displaying and Editing References](#displaying-and-editing-selected-references)
  - [Deleting References](#deleting-references)
  - [Downloading References](#downloading-references)
- [How It Works](#how-it-works)
  - [Architecture](#architecture)
    - [Background](#background)
    - [Popup](#popup)
    - [Content](#content)
  - [References](#references)
    - [Anatomy of a Reference](#anatomy-of-a-reference)
    - [Capturing References](#capturing-references)

# Installation

Currently, Wikiref is not in the Firefox Add-ons store, so you can only add it as a temporary add-on. I do plan to apply to get this put on the extension store, but in the meantime, here are instructions for adding it as a temporary add-on in Firefox:

1. Clone the repo: `git clone https://github.com/zaataylor/wikiref.git`
2. Navigate to `about:debugging`
3. Select "This Firefox"
4. Click "Load Temporary Add-on"
5. Find the location of the cloned Wikiref repository from the dropdown and click on any file in the extension directory.
6. Navigate to a Wikipedia page and have fun! :)

# How to Use It

We'll illustrate how to use Wikiref by extracting some references from [this](https://en.wikipedia.org/wiki/Dynamic_array) Wikipedia page about dynamic arrays:
![Dynamic Arrays Image](https://user-images.githubusercontent.com/40524990/144168102-294128c1-0359-40ed-a513-a8bdd1056b66.png)

## Selecting References

We can capture specific references on the page by first clicking the Wikiref popup in the browser toolbar, then entering Select Mode by clicking "Select References".
![Select References Popup](https://user-images.githubusercontent.com/40524990/144168185-388c6cdf-ab11-497f-8c14-ebb2f3edcb3b.png)

Next, we can scroll down to the "References" or "External Links" sections and click on the UI element of interest. The item will be highlighted and encircled by a solid black border to make it clear what is currently selected.

![Select References Example](https://user-images.githubusercontent.com/40524990/144171352-698b8a7c-f4be-4dda-9287-4c8951775770.gif)

Since the item we'll click on is likely a list item of some sort, we can optionally expand our selection to encompass all of the list items contained in the same list as the item that was originally clicked on. This makes extracting an entire section of references from a specific part of the page very easy.

![Expand References Example](https://user-images.githubusercontent.com/40524990/144171405-5975f466-a157-4db9-b60b-a64201fd93ff.gif)

After selecting a reference or section of references, we can extract the text and external links associated with these references by clicking the green check box that appears under the selected items. If we want to change our current selection instead of capturing the currently selected element(s), we can simply click on the new element we want to select. Alternatively, if we want to deselect the currently selected references, we can simply press the red &#10005; that appears under the selected element(s). The screen capture below illustrates all of these features in the order: extract references, change selection, and cancel selection.

![Extract, Change Selection, Cancel Selection Example](https://user-images.githubusercontent.com/40524990/144171434-2180910e-9395-4b28-a24a-89c48f1b51f9.gif)

## Displaying and Editing Selected References

If you've captured a set of references and want to see what they look like in tabular form, along with any external links they contain, you can enter Display Mode. This will insert a `<div>` element near the middle of the window containing a table, where items in the first column of the table are the reference text and numbered items in the second column are the external links associated with that reference text.

Since the reference titles are pulled directly from the HTML of the page, you may notice that some titles include Wikipedia page navigation indicators such as "^", or increasing character sequences like "a b c" that indicate multiple citations of a particular reference. This can be annoying if you're just trying to capture the actual reference's text, which is why Display Mode also enables you to edit the text of references.

To edit references in Display Mode, click the pencil icon in the top right of the `<div>`. This icon will become highlighted, indicating that you're in Edit Mode. From here, you can click on one reference at a time, edit the text as needed, then click away from it or press the `tab` character to finalize the edit. I am _not_ a skilled web developer, and the Edit Mode view may not be the most visually appealing or well-designed user experience. I consider it a work in progress, and I welcome user feedback to help make it better!

After you've made all of your edits, you can exit Edit Mode by clicking the pencil icon again, which should revert the icon's appearance to its original form. From here, you can either download the edited references as JSON by clicking the export icon to the left of the pencil icon, or exit Display Mode entirely by clicking the X icon to the right of the pencil icon.

![Displaying and Editing Selected References Example](https://user-images.githubusercontent.com/40524990/144171520-7faceea2-6e76-4d58-b588-0cc95e81ccc0.gif)

## Deleting References

If you decide you want to start over and delete the references you've previously captured, you can select "Delete References" in the popup UI, which will remove the references from [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

![Delete References Example](https://user-images.githubusercontent.com/40524990/144171974-36d5cbda-eb91-40b6-bb3b-645ea429951b.gif)

## Downloading References

If you're satisfied with the references you've currently captured/edited and want to download these references (text and any external links) as JSON, you can do so simply by clicking "Download References" in the popup UI.

This will create a JSON file that is named based on the lowercased version of the last portion (splitting based on `/` and ignoring document sections indicated by `#`) of the `document.baseURI` of the current page. For instance, if the current page (and section) you've navigated to and captured references on is [`https://en.wikipedia.org/wiki/Hard_disk_drive#References`](https://en.wikipedia.org/wiki/Hard_disk_drive#References), downloading the references will generate `hard_disk_drive.json`.

![Download References Example](https://user-images.githubusercontent.com/40524990/144171621-f88ad75c-c54c-40b5-9c9e-8e3b2d503adf.gif)

# How It Works

## Architecture

Wikiref is comprised of three components, following the pattern used by extensions: background, popup, and content.

### Background

`background.js`: This script contains the logic for actually executing a download of references after receiving a message from the content script. It primarily consists of a `handleMessage` event listener that currently just listens for messages related to downloads, but could easily be extended later on to encompass other kinds of events.

### Popup

`popup.js`: Logic in this script listens for clicks on the extension popup and sends specific messages to the content script running in the active tab of the current window, triggering different extension modes such as Select Mode and Display Mode.

`popup.css`: Styling for the popup.

`wikiref.html`: Skeleton of the popup.

### Content

`wikiref.js`: The "brain" behind Wikiref. Contains all of the logic for selecting, extracting, displaying, initiating download of, and editing references.

## References

### Anatomy of a Reference

A reference is represented by a relatively simple data structure. It is a JavaScript object that consists of `text`, `links`, `hash`, and `id` properties. `text` is a string containing the text of the reference as it appears on the topic page. `links` is an array containing the `href` values of each _external_ link included in the specific reference text; currently non-external links aren't captured. `hash` is a SHA-1 hash of the normalized `document.baseURI` concatenated with `text` using the `|` character as a separator. `id` is an incrementing integer value that indicates the order in which a reference was extracted.

### Capturing References

The algorithm for capturing references is relatively straightforward. Here's the sequence of steps it follows:

1. User enters Select Mode by clicking "Select References" in the extension popup UI.
   - This adds a `click` event listener to `document.body` and changes the style of the cursor to `pointer` so it's more intuitive to the user that they can now click on references.
2. User clicks on a particular reference item.
   - Internal logic determines what item was clicked using `event.target`, then traverses up the `element.parentElement` lineage for the clicked element until it finds an `<li>`. This parent element is marked as the actual element from which reference information will be extracted. This makes it easy to consistently apply styles to a selected reference regardless of what part of the reference is clicked, since clicks are really "bubbled up" to the parent `<li>` containing the clicked element.
   - A check is made to see if there was a previously selected element, and if so, any applied styles are removed from the previously selected element.
   - Styles are applied to the newly selected element to visually indicate it is highlighted. This includes a `<div>` containing action buttons -- &check; for confirm selection, "Expand Selection" for highlighting the entire list the `<li>` is contained in, and &#10005; for cancelling selection -- that's inserted directly under the highlighted `<li>`.
3. When a user clicks on the green &check; icon -- possibly after having expanded selection to all items in a list by clicking `Expand Selection` in the `<div>` option panel inserted at the end of step #2, it triggers a function that ultimately calls `extractReference(child, index)`, which has a relatively straightforward implementation:

   ```javascript
   /**
    * Extracts a reference from a child element.
    * This should be an <li>
    */
   async function extractReference(child, index) {
   	var ref = {
   		id: index,
   		hash: "",
   		text: "",
   		links: [],
   	};

   	ref.text = child.innerText;
   	// Hash based on current document and text of reference.
   	ref.hash = await digestMessage(`${getBaseURI()}|${ref.text}`);

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
   ```

4. The captured reference(s) are stored in `localStorage`.
5. Highlighting is removed from the captured references.

### Storing References

Currently, references captured for a given page are stored using `localStorage`, with the key being equal to a normalized version of `document.baseURI`, and the value being a `JSON.stringify`'d version of a list of reference objects.
