const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;

class Scraper {
  constructor() {
    this.jobs = [];
    this.baseUrl = "https://uk.indeed.com";
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
  }

  async searchJobs({ what, where, maxPages = 1 }) {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      for (let page = 0; page < maxPages; page++) {
        const startPosition = page * 10;
        const url = `${this.baseUrl}/jobs?q=${encodeURIComponent(
          what
        )}&l=${encodeURIComponent(where)}&start=${startPosition}`;

        console.log(`Scraping page ${page + 1}`);
        await this.page.goto(url, { waitUntil: "networkidle0" });

        // Wait for job cards to load
        await this.page.waitForSelector(".job_seen_beacon");

        // Extract jobs from current page
        await this.extractJobsFromPage(this.page);

        // Random delay between requests
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 3000 + 2000)
        );
      }
    } catch (error) {
      console.error("Error during job search:", error);
      throw error;
    }
  }

  async extractJobsFromPage(page) {
    try {
      console.log("Extracting jobs from page...");

      const pageJobs = await page.evaluate(() => {
        const jobCards = document.querySelectorAll(".job_seen_beacon");
        return Array.from(jobCards).map((card) => {
          // Helper function to safely extract text
          const safeExtract = (selector, parent = card) => {
            const element = parent.querySelector(selector);
            return element ? element.textContent.trim() : "";
          };

          // Get job URL
          const linkElement = card.querySelector("a.jcs-JobTitle");
          const jobUrl = linkElement ? linkElement.href : "";

          return {
            title: safeExtract(".jobTitle"),
            company: safeExtract(".companyName"),
            location: safeExtract(".companyLocation"),
            salary: safeExtract(".metadata.salary-snippet-container"),
            description: safeExtract(".job-snippet"),
            datePosted: safeExtract(".date"),
            url: jobUrl,
            scrapeDate: new Date().toISOString(),
          };
        });
      });

      this.jobs.push(...pageJobs);
      console.log(
        `Found ${pageJobs.length} jobs on this page. Total jobs: ${this.jobs.length}`
      );
    } catch (error) {
      console.error("Error extracting jobs from page:", error);
      return [];
    }
  }

  async saveToJson(filename = "indeed_jobs.json") {
    try {
      console.log("Saving jobs to JSON...");
      const filePath = path.join(process.cwd(), filename);
      await fs.writeFile(filePath, JSON.stringify(this.jobs, null, 2), "utf8");
      console.log(`Saved ${this.jobs.length} jobs to ${filename}`);
    } catch (error) {
      console.error("Error saving jobs to file:", error);
      throw error;
    }
  }

  async saveToCsv(filename = "indeed_jobs.csv") {
    try {
      console.log("Saving jobs to CSV...");
      if (this.jobs.length === 0) {
        throw new Error("No jobs to save");
      }

      // Create CSV header
      const headers = Object.keys(this.jobs[0]).join(",");

      // Create CSV rows
      const rows = this.jobs.map((job) => {
        return Object.values(job)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",");
      });

      // Combine header and rows
      const csv = [headers, ...rows].join("\n");

      // Save to file
      const filePath = path.join(process.cwd(), filename);
      await fs.writeFile(filePath, csv, "utf8");
      console.log(`Saved ${this.jobs.length} jobs to ${filename}`);
    } catch (error) {
      console.error("Error saving jobs to file:", error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Example usage
async function main() {
  const scraper = new Scraper();

  try {
    await scraper.searchJobs({
      what: "javascript developer",
      where: "London",
      maxPages: 22,
    });

    await scraper.saveToJson("london_js_jobs.json");
    await scraper.saveToCsv("london_js_jobs.csv");
  } catch (error) {
    console.error("Top-level error:", error);
  } finally {
    await scraper.close();
  }
}

main();
