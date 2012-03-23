#!/usr/bin/env node

var util = require('util'),
    jsdom = require('jsdom'),
    request = require('request');

function main() {
  scrape('http://findingaids.loc.gov/source/main', findCollections);
}

function scrape(url, callback) {
  jsdom.env(url, ['http://code.jquery.com/jquery-1.5.min.js'],
    function (errors, window) {
      callback(window);
    }
  );
}

function findCollections(window) {
  window.$('li em a').each(function (i, coll) {
    var url = 'http://findingaids.loc.gov/source/' + window.$(coll).attr('href');
    scrape(url, findXML); 
  });
}

function findXML(window) {
  window.$('a').each(function (i, a) {
    var a = window.$(a);
    var text = a.text();
    if (text == "[XML]") {
      saveXml(a.attr('href'), window.location);
    } else if (text == "[METS]") {
      saveXml(a.attr('href'), window.location);
    }
  });
}

function saveXml(url, referer) {
  request(url, function (err, response, body) {
    if (err) {
      console.log("err: " + err + " ; " + url + " referer: " + referer);
    }
    else {
      console.log("ok: " + url);
    }
  });
}

main();
