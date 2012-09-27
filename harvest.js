var fs = require('fs'),
    url = require('url'),
    http = require('http'),
    jsdom = require('jsdom'),
    request = require('request'),
    libxmljs = require('libxmljs');

// be gentle to loc
http.globalAgent.maxSockets = 1;

// some namespaces
ns = {
  mets: "http://www.loc.gov/METS/",
  ead: "urn:isbn:1-931666-22-9",
  atom: "http://www.w3.org/2005/Atom",
  dcterms: "http://purl.org/dc/terms/"
};

function main() {
  scrape('http://findingaids.loc.gov/source/main', findCollections);
  generateFeed();
}

function findCollections(window) {
  window.$('li em a').each(function (i, coll) {
    var url = 'http://findingaids.loc.gov/source/' + window.$(coll).attr('href');
    scrape(url, findXml); 
  });
}

function findXml(window) {
  window.$('a').each(function (i, a) {
    var a = window.$(a);
    var text = a.text();
    var url = a.attr('href');
    if (text == '[XML]' || text == '[METS]') {
      saveXml(url);
    }
  });
}

function saveXml(url) {
  var filename = "data/" + url.split("/").pop() + ".xml";
  request(url, function (error, response, body) {
    console.log("saving " + url + " as " + filename);
    if (error) {
      console.log("uhoh: " + error + ": " + url);
    } else {
      fs.writeFile(filename, body);
    }
  });
}

function scrape(url, callback) {
  jsdom.env(url, ['http://code.jquery.com/jquery-1.5.min.js'],
    function (errors, window) {
      callback(window);
    }
  );
}

function generateFeed() {
  var files = xmlFiles();
  var items = [];
  for (var i in files) {
    var file = files[i];
    var doc = xmlDoc(file);
    if (! doc) continue;

    var hdr = doc.get(".//mets:metsHdr", ns);
    if (! hdr) continue;

    items.push({
      created: hdr.attr('CREATEDATE').value(),
      updated: hdr.attr('LASTMODDATE').value(),
      url: url.parse(hdr.get("string(.//mets:metsDocumentID)", ns)),
      title: clean(doc.get('string(.//ead:titleproper)', ns)),
      scope: clean(doc.get('string(.//ead:scopecontent/ead:p)', ns))
    });
  }

  items.sort(function(a, b) {
    if (a.updated === b.updated) return 0
    else if (a.updated < b.updated) return 1
    else return -1
  });

  var feed = new libxmljs.Document().node("feed");
  feed.attr({"xmlns": ns.atom});
  feed.node("title", "Library of Congress Finding Aids");
  feed.node("id", "http://findingaids.loc.gov");
  feed.node("link").attr({
    rel: "self",
    type: "application/atom+xml",
    href: "https://raw.github.com/edsu/lc-findingaids/master/feed.xml"
  })

  for (var i in items) {
    var item = items[i];
    var githubUrl = 
      "https://raw.github.com/edsu/lc-findingaids/master/data/" + 
      item.url.path.split('/').pop() + 
      ".xml";

    var e = feed.node('entry');
    e.node('id', url.format(item.url));
    e.node('title', item.title);
    e.node('updated', item.updated);
    e.node('summary', item.scope);
    e.node('link').attr({
      rel: "alternate", 
      href: githubUrl, 
      type: "application/ead+xml"
    });
    e.node('created', item.created).attr({xmlns: ns.dcterms});
  }

  fs.writeFileSync("feed.xml", feed.toString());
}

function xmlDoc(filename) {
  var xml = fs.readFileSync(filename);
  try {
    return libxmljs.parseXmlString(xml.toString());
  } catch(err) {
    console.log(err + ": " + filename + " isn't xml");
  }
}

function xmlFiles() {
  var filenames = fs.readdirSync("data");
  return filenames.map(function (f) {
    return "data/" + f;
  });
}

function clean(s) {
  s = s.replace(/\n/g, " ");
  s = s.replace(/\t/g, " ");
  s = s.replace(/ +/g, " ");
  s = s.replace(/ & /g, '&amp;');
  return s;
}

main();
