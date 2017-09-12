// returns data
async function decrypt(iv, key, data) {
    const k = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, data);
}

function decode(s) {
    s = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==');
    var arr = new Uint8Array(s.length);
    for (var i = 0; i < arr.length; i++)
        arr[i] = s.charCodeAt(i);
    return arr;
}

function err(message) {
    document.body.className = 'error';
    document.querySelector('.status .text.open').innerHTML = message;
}

async function main() {
    const s = location.hash.slice(1).split('/');
    if (s[0] === 'preview') {
        return location.assign(location.hash.slice('preview'.length + 2));
    }
    const b = decode(s[0]);
    const iv = new Uint8Array(12);
    const key = new Uint8Array(16);
    iv.set(b.slice(0, 12));
    key.set(b.slice(12, 28));

    // XMLHttpRequest instead of fetch since there is no progress reporting with fetch
    var req = new XMLHttpRequest();
    req.open('GET', '/' + s[1], true);
    req.responseType = 'arraybuffer';
    req.onprogress = function(e) {
        document.querySelector('.progress .bar').style.width = ~~(e.loaded / e.total * 100) + '%';
    }
    req.onload = async function() {
        req.onprogress = null;

        if (req.status !== 200)
            return err('File has expired or is invalid');

        document.querySelector('.progress .bar').style.width = '100%';
        document.querySelector('.status .text.open').innerHTML = 'DECRYPTING';

        try {
            var b = new Blob([await decrypt(iv, key, this.response)], { type: req.getResponseHeader('Content-Type')});
        } catch(e) {
            return err('message' in e ? e.message : e);
        }

        document.body.className = 'done';
        document.querySelector('.status .text.open').innerHTML = 'OPEN';

        var name = decodeURIComponent(req.getResponseHeader('Content-Disposition').split('"')[1].split('"')[0]);
        console.log(name);
        var d = document.createElement('div');
        d.className = 'info';
        d.innerHTML = '<div class="name">' + name + '</div>&nbsp;<span class="size">' + filesize(b.size) + '</span>';
        document.querySelector('.status').appendChild(d);

        var u = URL.createObjectURL(b);
        var a = document.createElement('a');
        a.className = 'open';
        a.target = '_blank'
        a.href = u;
        var suggested = false;
        a.onclick = function() {
            window.open(u, '_blank').onunload = function() {
                if (suggested) return;
                suggested = true;
                document.body.className += ' suggest';
            }
            return false;
        }
        document.body.appendChild(a);

        var ad = document.querySelector('.status .text.download');
        ad.href = u;
        ad.download = name;
    }
    req.send();

    // const response = await fetch('/' + s[1]);
    // const data = await decrypt(iv, key, await response.arrayBuffer());
    // var iframe = document.createElement('iframe');
    // iframe.src = URL.createObjectURL(new Blob([data], { type: response.headers.get('Content-Type')}));
    // document.body.appendChild(iframe);
    // open(URL.createObjectURL(new Blob([data], { type: response.headers.get('Content-Type')})), '_blank').focus();
}

main();