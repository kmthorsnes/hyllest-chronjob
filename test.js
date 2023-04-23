const cheerio = require("cheerio");

fetch("https://dagbladet.no")
  .then(function (response) {
    return response.text();
  })
  .then(function (html) {
    // Load the HTML in Cheerio
    const $ = cheerio.load(html);

    // Select all anchor tags from the page
    const links = $("a");

    // Loop over all the anchor tags
    links.each((index, value) => {
      // Print the text from the tags and the associated href
      console.log($(value).text(), " => ", $(value).attr("href"));
    });
  })
  .catch(function (err) {
    console.log("Failed to fetch page: ", err);
  });
