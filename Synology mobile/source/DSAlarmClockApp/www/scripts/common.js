// wrapper for ...
function toStaticHtml(html) {
    if (window.toStaticHTML == null)
        return html;
    else
        return window.toStaticHTML(html);
}
