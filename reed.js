const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;

class ReedScraper {
  constructor(baseUrl = "https://www.reed.co.uk") {
    this.jobs = [];
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
  }

  async initializeBrowser() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });
    this.page = await this.browser.newPage();
    await this.setupRequestInterception();
  }

  async setupRequestInterception() {
    await this.page.setRequestInterception(true);
    this.page.on("request", (request) => {
      const resourceType = request.resourceType();
      if (
        ["image", "stylesheet", "font", "media"].includes(resourceType) ||
        ["google", "analytics", "doubleclick", "ads"].some((str) =>
          request.url().includes(str)
        )
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
  }

  async searchJobs({ keywords, location, maxPages = 1 }) {
    if (!this.browser) await this.initializeBrowser();

    try {
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const url = `${this.baseUrl}/jobs/${encodeURIComponent(
          keywords
        ).toLowerCase()}-jobs-in-${encodeURIComponent(location).toLowerCase()}`;
        console.log(`Scraping page ${pageNum}: ${url}`);

        await this.page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });
        await this.page.waitForSelector("#server-results", { timeout: 10000 });

        console.log("Page Title:", await this.page.title());

        const jobsFound = await this.extractJobsFromPage();
        if (!jobsFound) break;

        if (!(await this.hasNextPage(pageNum, maxPages))) break;
        await this.page.click(`a[data-page="${pageNum + 1}"]`);
        await this.page.waitForNavigation({ waitUntil: "networkidle0" });
        await this.randomDelay();
      }
    } catch (error) {
      console.error("Error during job search:", error);
    }
  }

  async extractJobsFromPage() {
    try {
      const pageJobs = await this.page.evaluate(() => {
        const cards = Array.from(
          document.querySelectorAll("#server-results article.card")
        );
        return cards
          .map((card) => ({
            title:
              card
                .querySelector("h2.job-result-heading__title")
                ?.textContent?.trim() || "",
            company:
              card
                .querySelector(".job-result-company__name")
                ?.textContent?.trim() || "",
            location:
              card
                .querySelector(".job-metadata__item--location")
                ?.textContent?.trim() || "",
            salary:
              card
                .querySelector(".job-metadata__item--salary")
                ?.textContent?.trim() || "",
            posted:
              card
                .querySelector("div.job-result-heading__posted-by")
                ?.textContent?.trim() || "",
            url:
              card.querySelector("h2.job-result-heading__title a")?.href || "",
            scrapeDate: new Date().toISOString(),
          }))
          .filter((job) => job.title);
      });

      if (pageJobs.length) {
        this.jobs.push(...pageJobs);
        console.log(
          `Found ${pageJobs.length} jobs on this page. Total jobs: ${this.jobs.length}`
        );
        return true;
      } else {
        console.log("No jobs found on this page");
        return false;
      }
    } catch (error) {
      console.error("Error extracting jobs from page:", error);
      return false;
    }
  }

  async hasNextPage(currentPage, maxPages) {
    const hasNextPage = await this.page.evaluate(() => {
      const pagination = document.querySelector(".pagination");
      const currentPage = parseInt(
        pagination.querySelector(".active")?.textContent || "1"
      );
      return Boolean(
        pagination.querySelector(`a[data-page="${currentPage + 1}"]`)
      );
    });
    return hasNextPage && currentPage < maxPages;
  }

  async randomDelay() {
    return new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 1000)
    );
  }

  async saveToFile(data, filename, formatter) {
    const filePath = path.join(process.cwd(), filename);
    await fs.writeFile(filePath, formatter(data), "utf8");
    console.log(`Saved ${this.jobs.length} jobs to ${filename}`);
  }

  async saveToJson(filename = "reed_jobs.json") {
    await this.saveToFile(this.jobs, filename, (jobs) =>
      JSON.stringify(jobs, null, 2)
    );
  }

  async saveToCsv(filename = "reed_jobs.csv") {
    if (this.jobs.length === 0) throw new Error("No jobs to save");

    const headers = Object.keys(this.jobs[0]).join(",");
    const rows = this.jobs.map((job) =>
      Object.values(job)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvData = [headers, ...rows].join("\n");

    await this.saveToFile(csvData, filename, (data) => data);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

(async function main() {
  const scraper = new ReedScraper();

  try {
    await scraper.searchJobs({
      keywords: "javascript developer",
      location: "london",
      maxPages: 2,
    });
    if (scraper.jobs.length) {
      await scraper.saveToJson("london_reed_jobs.json");
      await scraper.saveToCsv("london_reed_jobs.csv");
    } else {
      console.log("No jobs were found to save");
    }
  } catch (error) {
    console.error("Top-level error:", error);
  } finally {
    await scraper.close();
  }
})();
