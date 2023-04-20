const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const urls = {
  dagbladet: "https://www.dagbladet.no/",
  nettavisen: "https://www.nettavisen.no/",
};

const dagbladetLinkRegex = /^https:\/\/www\.dagbladet\.no\/.*$/;
const hyllRegex = /\bhyll[a-zA-ZøæåØÆÅ]*\b/gi;

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
      $("a[aria-label]").each(function () {
        const link = $(this).attr("href");
        if (link.match(dagbladetLinkRegex)) {
          const content = $(this).attr("aria-label");
          if (content.match(hyllRegex)) {
            hyllCounts[key].content.push({
              content,
              url: link,
            });
          }
        }
      });
    } else if (key === "nettavisen") {
      $("a > h1, a > h2, a > h3, a > h4, a > h5, a > h6").each(function () {
        const content = $(this).text();
        if (content.match(hyllRegex)) {
          hyllCounts[key].content.push({
            content,
            url: value,
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
        total_checks: 1,
        total_hyll_mean: allSitesHyllMean,
        first_check_date: timestamp,
      },
      dagbladet: {
        nettside_hyll_mean: hyllCounts.dagbladet.count,
      },
      nettavisen: {
        nettside_hyll_mean: hyllCounts.nettavisen.count,
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