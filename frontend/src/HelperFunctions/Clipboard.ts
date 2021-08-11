function fallbackCopyTextToClipboard(text: string) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful

    } catch (err) {
        document.body.removeChild(textArea);
        return false
    }
}

export function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
        console.log(1)
        return fallbackCopyTextToClipboard(text);;
    }

    let output = navigator.clipboard.writeText(text).then(function () {
        return true
    }, function (err) {
        return false
    });
    return output
}
