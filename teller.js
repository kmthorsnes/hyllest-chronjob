const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const urls = {
  dagbladet: "https://www.dagbladet.no/",
  nettavisen: "https://www.nettavisen.no/",
};

const hyllRegex = /\better[a-zA-ZøæåØÆÅ]*\b/gi;

const checkCount = async (url) => {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const content = $("body").text();
    const matches = content.match(hyllRegex);
    return matches ? matches.length : 0;
  } catch (err) {
    console.error(`Error checking ${url}:`, err);
    return 0;
  }
};

const runChecks = async () => {
  const hyllCounts = {};
  for (const [key, value] of Object.entries(urls)) {
    const count = await checkCount(value);
    hyllCounts[key] = {
      count,
      content: [],
    };
    const $ = cheerio.load(await (await axios.get(value)).data);
    if (key === "dagbladet") {
      $("a").each(function () {
        console.log($(this).attr("ariaLabel"));
        // const content = $(this).attr("ariaLabel");
        // console.log(content)
        // const link = $(this).attr("href");
        // if (link.match(hyllRegex)) {
        //   hyllCounts[key].content.push({
        //     content: content,
        //     url: link,
        //   });
        //   console.log("content:", content, "url:", link, "link:", this);
        // }
      });
    } else if (key === "nettavisen") {
      $("a > h1, a > h2, a > h3, a > h4, a > h5, a > h6").each(function () {
        const content = $(this).text();
        if (content.match(hyllRegex)) {
          const link =
            "https://www.nettavisen.no" + $(this).parent("a").attr("href");
          hyllCounts[key].content.push({
            content,
            url: link,
          });
        }
      });
    }
  }
  const timestamp = new Date().toISOString();
  const allSitesHyllMean =
    (hyllCounts.dagbladet.count + hyllCounts.nettavisen.count) / 2;
  const data = {
    total_check: {
      all_sites: {
        total_checks: fs.existsSync("hylling.json")
          ? JSON.parse(fs.readFileSync("hylling.json")).total_check.all_sites
              .total_checks + 1
          : 1,
        total_hyll_mean: allSitesHyllMean,
        first_check_date: fs.existsSync("hylling.json")
          ? JSON.parse(fs.readFileSync("hylling.json")).total_check.all_sites
              .first_check_date
          : timestamp,
      },
      dagbladet: {
        nettside_hyll_mean: hyllCounts.dagbladet.count,
      },
    },
    latest_check: {
      latest_check_date: timestamp,
      latest_total_hyll_count:
        hyllCounts.dagbladet.count + hyllCounts.nettavisen.count,
      dagbladet: {
        last_measurement: {
          count: hyllCounts.dagbladet.count,
          last_measurement_time: {
            timestamp,
            content: hyllCounts.dagbladet.content,
          },
        },
      },
      nettavisen: {
        last_measurement: {
          count: hyllCounts.nettavisen.count,
          last_measurement_time: {
            timestamp,
            content: hyllCounts.nettavisen.content,
          },
        },
      },
    },
  };

  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync("hylling.json", json);
  console.log("Successfully wrote");
};

runChecks();
