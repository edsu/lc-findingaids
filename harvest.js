var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    jsdom = require('jsdom'),
    request = require('request');

// be gentle with only 2 concurrent requests
http.globalAgent.maxSockets = 2;

function main() {
  scrape('http://findingaids.loc.gov/source/main', findCollections);
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
    fs.writeFile(filename, body);
  });
}

function scrape(url, callback) {
  jsdom.env(url, ['http://code.jquery.com/jquery-1.5.min.js'],
    function (errors, window) {
      callback(window);
    }
  );
}

main();