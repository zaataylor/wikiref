<a href="https://project-types.github.io/#toy">
  <img src="https://img.shields.io/badge/project%20type-toy-blue" alt="Toy Badge"/>
</a>

# Description

Wikipedia, the world's online encyclopedia, is a useful, curated source of information. Often, however, it's said that one of the most value parts of any given Wikipedia article are not the user-contributed topic explanations, but the references and external links from which those explanations are based.

Wikiref aims to make the process of extracting these sources for later review or analysis dead simple. It operates as a Firefox (and soon to be Chrome!) browser extension that is only active when you're on a Wikipedia page.

# How to Use It

## Selecting References

If you're on a Wikipedia page that interests you, you can capture specific references on the page by first clicking the Wikiref popup in the browser toolbar, then entering Select Mode by clicking "Select References". Next, just click on the UI element of interest. The item will be highlighted and encircled by a solid black border to make it clear what is currently selected. Since the item you'll click on is likely a list item of some sort, you can optionally expand your selection to encompass all of the list items contained in the same list as the item that was originally clicked on. This makes extracting an entire section of references from a specific part of the page very easy.

After selecting a reference or section of references, you can extract the text and external links associated with these references by clicking the green check box that appears under the selected items<sup>\*</sup>. If you want to change your current selection instead of capturing the currently selected element(s), simply click on the new element you want to select. Alternatively, if you want to exit Select Mode entirely without capturing any references, including those that are currently selected, simply press the red X that appears under the selected element(s).

<sup>\*</sup>_Currently, there is a somewhat annoying limitation on Select Mode. After confirming selection of a given item/group of items in the UI, Select Mode is toggled off. I did this because it was easier to implement at the time, but I'm realizing now that users may want to be able to simply enter Select Mode once, confirm selection multiple times, then click somewhere on the extension popup again in order to exit Selection Mode. This may be a future enhancement._

## Displaying and Editing Selected References

If you've captured a set of references and want to see what they look like in tabular form, along with any external links they contain, you can enter Display Mode. This will insert a `<div>` element near the middle of the window containing a table, where items in the first column of the table are the reference text and numbered items in the second column are the external links associated with that reference text.

Since the reference titles are pulled directly from the HTML of the page, you may notice that some titles include Wikipedia page navigation indicators such as "^", or increasing character sequences like "a b c" that indicate multiple citations of a particular reference. This can be annoying if you're just trying to capture the actual reference's text, which is why Display Mode also enables you to edit the text of references.

To edit references in Display Mode, click the pencil icon in the top right of the `<div>`. This icon will become highlighted, indicating that you're in Edit Mode. From here, you can click on one reference at a time, edit the text as needed, then click away from it or press the `tab` character to finalize the edit. I am _not_ a skilled web developer, and the Edit Mode view may not be the most visually appealing or well-designed user experience. I consider it a work in progress, and I welcome user feedback to help make it better!

After you've made all of your edits, you can exit Edit Mode by clicking the pencil icon again, which should revert the icon's appearance to its original form. From here, you can either download the edited references as JSON by clicking the export icon to the left of the pencil icon, or exit Display Mode entirely by clicking the X icon to the right of the pencil icon.

## Deleting References

If you decide you want to start over and delete the references you've previously captured, you can select "Delete References" in the popup UI, which will remove the references from [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)<sup>\*</sup>.

<sup>\*</sup>_Currently there's a bit of a UI fail when it comes to receiving confirmation of successfully deleting references. Though the extension popup UI contains the "Delete References" option, clicking it will not immediately change the popup UI's appearance or provide any indication of deletion. However, closing the popup by clicking away and opening it again should show a missing "Delete References" button, which is an indication that there are no references currently captured on that page._

## Downloading References

If you're satisfied with the references you've currently captured/edited and want to download these references (text and any external links) as JSON, you can do so simply by clicking "Download References" in the popup UI.

This will create a JSON file that is named based on the lowercased version of the last portion (splitting based on `/` and ignoring document sections indicated by `#`) of the `document.baseURI` of the current page. For instance, if the current page (and section) you've navigated to and captured references on is [`https://en.wikipedia.org/wiki/Hard_disk_drive#References`](https://en.wikipedia.org/wiki/Hard_disk_drive#References), downloading the references will generate `hard_disk_drive.json`.

# How It Works

TBD
