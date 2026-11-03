// A system contribution stays separate from authored source and all verification flags.
// This projection admits passive reading HTML only; it never derives a verification seal.
export function postSystemAdditionHtml2029(value, document = globalThis.document) {
  if (typeof value !== 'string' || !value.trim() || !document?.createElement) return '';
  const template = document.createElement('template'); template.innerHTML = value;
  template.content.querySelectorAll('script,style,link,iframe,object,embed,form,input,button,textarea,select,meta,base,svg,math').forEach(n => n.remove());
  for (const node of template.content.querySelectorAll('*')) for (const attr of [...node.attributes]) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || ['style', 'srcdoc', 'srcset', 'id', 'formaction', 'autofocus', 'ping'].includes(name)) node.removeAttribute(attr.name);
    if (['href', 'src', 'poster', 'action', 'xlink:href'].includes(name)) {
      try {
        const url = new URL(attr.value, 'https://sod1820.co.il');
        if (!['https:', 'http:'].includes(url.protocol) || /[\u0000-\u0020\u007f]/.test(attr.value)) node.removeAttribute(attr.name);
      } catch { node.removeAttribute(attr.name); }
    }
  }
  for (const link of template.content.querySelectorAll('a[target="_blank"]')) link.setAttribute('rel', 'noopener noreferrer');
  return template.innerHTML.trim();
}
