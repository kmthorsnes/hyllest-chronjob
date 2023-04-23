const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const urls = {
  dagbladet: "https://www.dagbladet.no/",
  nettavisen: "https://www.nettavisen.no/",
};

const hyllRegex = /\bsjokk[a-zA-ZøæåØÆÅ]*\b/gi;
function removeFormatting(str) {
  if (str == null) {
    return '';
  }
  return str.replace(/(<([^>]+)>)/ig);
}


const checkCount = async (url) => {
  try {
    const response = await JSDOM.fromURL(url, { pretendToBeVisual: true });

    const content = response.window.document.body.textContent;
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
    const response = await JSDOM.fromURL(value, { pretendToBeVisual: true });

    const { document } = response.window;
    if (key === "dagbladet") {
      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        const content = link.getAttribute("aria-label");
        const href = link.getAttribute("href");
        const str = removeFormatting(content);
        console.log(str)
        if (str &&
          str.match(hyllRegex)) {
          hyllCounts[key].content.push({
            content,
            url: href,
          });
        }
      });
    } else if (key === "nettavisen") {
      const headers = document.querySelectorAll(
        "a > h1, a > h2, a > h3, a > h4, a > h5, a > h6"
      );
      headers.forEach((header) => {
        const content = header.textContent;
        if (content.match(hyllRegex)) {
          const href = "https://www.nettavisen.no" + header.parentNode.href;
          hyllCounts[key].content.push({
            content,
            url: href,
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
