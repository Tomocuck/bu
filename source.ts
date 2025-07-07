
import {
  Source,
  SourceInfo,
  Manga,
  Chapter,
  ChapterDetails,
  MangaStatus,
  LanguageCode,
  PagedResults,
  SearchRequest,
  SourceManga
} from "paperback-extensions-common"

export const MangaforfreeInfo: SourceInfo = {
  version: "1.0.0",
  name: "Mangaforfree",
  icon: "icon.png",
  author: "YourName",
  authorWebsite: "https://github.com/YourGitHub",
  description: "Extension for Mangaforfree.com",
  websiteBaseURL: "https://mangaforfree.com",
  language: LanguageCode.ENGLISH,
  contentRating: "MATURE",
  sourceTags: []
}

export class Mangaforfree extends Source {
  baseUrl = "https://mangaforfree.com"

  getMangaShareUrl(mangaId: string): string {
    return `${this.baseUrl}/manga/${mangaId}`
  }

  async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
    const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query.title ?? "")}`
    const request = createRequestObject({ url: searchUrl, method: "GET" })
    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)

    const manga: SourceManga[] = $("div.post")
      .map((_, el) => {
        const anchor = $("h3.manga-title a", el)
        const image = $("img", el).attr("src") ?? ""
        const id = anchor.attr("href")?.split("/manga/")[1]?.replace(/\/$/, "") ?? ""

        return createSourceManga({
          mangaId: id,
          title: anchor.text().trim(),
          image,
          subtitleText: ""
        })
      })
      .get()

    return createPagedResults({ results: manga })
  }

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const url = `${this.baseUrl}/manga/${mangaId}`
    const request = createRequestObject({ url, method: "GET" })
    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)

    const title = $("h1").first().text().trim()
    const image = $("div.summary_image img").attr("src") ?? ""
    const statusText = $("div.post-status .summary-content").text().toLowerCase()
    const status = statusText.includes("ongoing") ? MangaStatus.ONGOING : MangaStatus.COMPLETED

    const author = $('div.author:contains("Author") .summary-content').text().trim()
    const genres = $("div.genres .summary-content a")
      .map((_, el) => $(el).text().trim())
      .get()

    const desc = $("div.summary__content").text().trim()

    return createManga({
      id: mangaId,
      titles: [title],
      image,
      author,
      status,
      tags: [createTagSection({ id: "genres", label: "Genres", tags: genres.map(g => createTag({ id: g, label: g })) })],
      desc,
      rating: 0
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = `${this.baseUrl}/manga/${mangaId}`
    const request = createRequestObject({ url, method: "GET" })
    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)

    return $("ul.main.version-chap li.wp-manga-chapter a")
      .map((_, el) => {
        const link = $(el).attr("href") ?? ""
        const title = $(el).text().trim()
        const id = link.split("/").filter(Boolean).pop() ?? title

        return createChapter({
          id: link.replace(`${this.baseUrl}/`, ""),
          name: title,
          langCode: LanguageCode.ENGLISH
        })
      })
      .get()
      .reverse()
  }

  async getChapterDetails(chapterId: string): Promise<ChapterDetails> {
    const url = `${this.baseUrl}/${chapterId}`
    const request = createRequestObject({ url, method: "GET" })
    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)

    const pages = $("div.page-break img")
      .map((_, el) => $(el).attr("src") ?? "")
      .get()

    return createChapterDetails({
      id: chapterId,
      mangaId: chapterId.split("/")[1],
      pages,
      longStrip: true
    })
  }
}
