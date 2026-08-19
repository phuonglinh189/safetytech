(function () {
  "use strict";

  const FONT_REGULAR = "NotoSansTC-PDF.ttf";
  const FONT_BOLD = "NotoSansTC-PDF-Bold.ttf";
  const PURPLE = [112, 48, 160];
  const BLUE = [68, 114, 196];
  const PALE_PURPLE = [247, 242, 250];
  const PALE_BLUE = [242, 247, 253];
  const TEXT = [42, 42, 48];
  const MUTED = [92, 92, 101];

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  async function fetchFontBase64(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("PDF font request failed: " + response.status);
    return arrayBufferToBase64(await response.arrayBuffer());
  }

  async function registerFonts(doc, lang, assetBase) {
    if (lang !== "zh") return;
    const regular = await fetchFontBase64(assetBase + FONT_REGULAR);
    doc.addFileToVFS(FONT_REGULAR, regular);
    doc.addFont(FONT_REGULAR, "NotoSansTC", "normal");
    try {
      const bold = await fetchFontBase64(assetBase + FONT_BOLD);
      doc.addFileToVFS(FONT_BOLD, bold);
      doc.addFont(FONT_BOLD, "NotoSansTC", "bold");
    } catch (error) {
      doc.addFont(FONT_REGULAR, "NotoSansTC", "bold");
    }
  }

  function setFont(doc, lang, bold) {
    doc.setFont(lang === "zh" ? "NotoSansTC" : "helvetica", bold ? "bold" : "normal");
  }

  function chartToPng(chart, size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, size, size);
    context.drawImage(chart.canvas, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  }

  function drawSectionTitle(doc, lang, text, x, y, width) {
    doc.setFillColor(...PURPLE);
    doc.roundedRect(x, y, width, 17, 4, 4, "F");
    setFont(doc, lang, true);
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(text, x + 7, y + 11.5);
  }

  function drawLabelValue(doc, lang, label, value, x, y, width) {
    setFont(doc, lang, true);
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(label, x, y);
    setFont(doc, lang, false);
    doc.setFontSize(7.4);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(String(value || "-"), width);
    doc.text(lines.slice(0, 2), x, y + 9, { lineHeightFactor: 1.05 });
  }

  function drawMaturityScale(doc, lang, levels, x, y, width) {
    const height = 92;
    const columnWidth = width / 5;
    const markerY = y + 17;
    const firstCenter = x + columnWidth / 2;
    const lastCenter = x + width - columnWidth / 2;
    doc.setDrawColor(74, 134, 232);
    doc.setLineWidth(1.4);
    doc.line(firstCenter, markerY, lastCenter, markerY);

    levels.forEach((level, index) => {
      const centerX = x + columnWidth * index + columnWidth / 2;
      setFont(doc, lang, true);
      doc.setTextColor(...BLUE);
      doc.setFontSize(7.2);
      doc.text("L" + (index + 1), centerX, y + 8, { align: "center" });
      doc.setFillColor(index === 4 ? 255 : 221, index === 4 ? 255 : 238, index === 4 ? 255 : 250);
      doc.setDrawColor(74, 134, 232);
      doc.circle(centerX, markerY, 3.8, "FD");

      const title = String(level.name || "")
        .replace(/^Level\s+\d+\s*:\s*/i, "")
        .replace(/^等級\s*\d+\s*[：:]\s*/, "");
      let titleSize = 5.3;
      let titleLines = [];
      do {
        doc.setFontSize(titleSize);
        titleLines = doc.splitTextToSize(title, columnWidth - 8);
        if (titleLines.length <= 3 || titleSize <= 4.3) break;
        titleSize -= 0.2;
      } while (titleSize >= 4.3);
      doc.setTextColor(index === 4 ? 7 : 36, index === 4 ? 55 : 93, index === 4 ? 99 : 145);
      doc.text(titleLines.slice(0, 3), centerX, y + 30, {
        align: "center",
        lineHeightFactor: 1.05,
        maxWidth: columnWidth - 8
      });

      const visibleTitleLines = titleLines.slice(0, 3);
      const explanationY = y + 30 + visibleTitleLines.length * titleSize * 1.05 + 3;
      const explanationHeight = y + height - 4 - explanationY;
      const explanationWidth = columnWidth - 8;
      let explanationSize = 3.7;
      let explanationLines = [];
      setFont(doc, lang, false);
      do {
        doc.setFontSize(explanationSize);
        explanationLines = doc.splitTextToSize(String(level.meaning || ""), explanationWidth);
        if (explanationLines.length * explanationSize * 1.04 <= explanationHeight || explanationSize <= 2.8) break;
        explanationSize -= 0.15;
      } while (explanationSize >= 2.8);
      doc.setTextColor(...MUTED);
      doc.text(explanationLines, centerX, explanationY, {
        align: "center",
        lineHeightFactor: 1.04,
        maxWidth: explanationWidth
      });
    });
    return height;
  }

  function drawOverallCard(doc, lang, x, y, width, height, label, score, level) {
    doc.setFillColor(...PALE_PURPLE);
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, y, width, height, 6, 6, "FD");
    setFont(doc, lang, true);
    doc.setTextColor(...PURPLE);
    doc.setFontSize(7.6);
    doc.text(label, x + width / 2, y + 13, { align: "center", maxWidth: width - 10 });
    doc.setFontSize(21);
    doc.text(Number(score).toFixed(2), x + width / 2, y + 37, { align: "center" });
    doc.setFontSize(7.4);
    const levelLines = doc.splitTextToSize(level.name, width - 10);
    const levelStartY = y + 50;
    doc.text(levelLines, x + width / 2, levelStartY, { align: "center", lineHeightFactor: 1.04 });
    setFont(doc, lang, false);
    doc.setTextColor(...MUTED);
    let meaningSize = 5.6;
    let meaning = [];
    const meaningWidth = width - 14;
    const meaningStartY = levelStartY + levelLines.length * 7.4 * 1.04 + 3;
    const meaningHeight = y + height - 7 - meaningStartY;
    do {
      doc.setFontSize(meaningSize);
      meaning = doc.splitTextToSize(level.meaning, meaningWidth);
      if (meaning.length * meaningSize * 1.03 <= meaningHeight || meaningSize <= 3.8) break;
      meaningSize -= 0.2;
    } while (meaningSize >= 3.8);
    doc.text(meaning, x + 7, meaningStartY, { lineHeightFactor: 1.03 });
  }

  function drawDomainTable(doc, options, x, y, width, height) {
    const { lang, t, domains, scores } = options;
    const nameWidth = width * 0.48;
    const scoreWidth = (width - nameWidth) / 2;
    const rowHeight = height / 5;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(196, 207, 225);
    doc.roundedRect(x, y, width, height, 5, 5, "FD");
    setFont(doc, lang, true);
    doc.setFontSize(6.4);
    doc.setTextColor(...BLUE);
    doc.text(t("pdf_domain"), x + 5, y + rowHeight * 0.68);
    doc.text(t("pdf_current"), x + nameWidth + scoreWidth / 2, y + rowHeight * 0.68, { align: "center" });
    doc.text(t("pdf_target"), x + nameWidth + scoreWidth * 1.5, y + rowHeight * 0.68, { align: "center" });
    setFont(doc, lang, false);
    doc.setTextColor(...TEXT);
    domains.forEach((domain, index) => {
      const rowY = y + rowHeight * (index + 1);
      doc.setDrawColor(215, 221, 232);
      doc.line(x + 4, rowY, x + width - 4, rowY);
      doc.setFontSize(6.4);
      doc.text(domain.name, x + 5, rowY + rowHeight * 0.68, { maxWidth: nameWidth - 8 });
      doc.text(scores[domain.id].current.toFixed(2), x + nameWidth + scoreWidth / 2, rowY + rowHeight * 0.68, { align: "center" });
      doc.text(scores[domain.id].target.toFixed(2), x + nameWidth + scoreWidth * 1.5, rowY + rowHeight * 0.68, { align: "center" });
    });
  }

  function recommendationItems(currentIndex, targetIndex, data, lang) {
    if (targetIndex <= currentIndex) return [];
    const items = [];
    for (let level = currentIndex + 1; level <= targetIndex; level += 1) {
      const from = level;
      const to = level + 1;
      const key = "transition_l" + from + "_l" + to;
      const title = data[key + "_title"];
      const description = data[key + "_description"];
      if (title && description) {
        items.push({
          transition: "L" + from + " -> L" + to,
          title: title[lang] || title.en,
          description: description[lang] || description.en
        });
      }
    }
    return items;
  }

  function recommendationLineCount(doc, items, noGap, width, fontSize) {
    doc.setFontSize(fontSize);
    if (!items.length) return doc.splitTextToSize(noGap, width).length;
    return items.reduce((total, item) => {
      const heading = item.transition + "  " + item.title;
      return total + doc.splitTextToSize(heading, width).length + doc.splitTextToSize(item.description, width).length + 1;
    }, 0);
  }

  function drawRecommendations(doc, options, x, y, width, height) {
    const { lang, t, items } = options;
    doc.setFillColor(252, 249, 253);
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, y, width, height, 6, 6, "FD");
    setFont(doc, lang, true);
    doc.setTextColor(...PURPLE);
    doc.setFontSize(9.4);
    doc.text(t("pdf_recommendations"), x + 8, y + 13);
    const innerWidth = width - 16;
    const maxTextHeight = height - 23;
    const noGap = t("pdf_no_transition");
    let fontSize = 8.2;
    while (fontSize > 6.2 && recommendationLineCount(doc, items, noGap, innerWidth, fontSize) * fontSize * 1.16 > maxTextHeight) {
      fontSize -= 0.3;
    }
    let cursorY = y + 23;
    if (!items.length) {
      setFont(doc, lang, false);
      doc.setTextColor(...TEXT);
      doc.setFontSize(fontSize);
      doc.text(doc.splitTextToSize(noGap, innerWidth), x + 8, cursorY, { lineHeightFactor: 1.12 });
      return;
    }
    items.forEach((item) => {
      setFont(doc, lang, true);
      doc.setTextColor(...PURPLE);
      doc.setFontSize(fontSize);
      const heading = doc.splitTextToSize(item.transition + "  " + item.title, innerWidth);
      doc.text(heading, x + 8, cursorY, { lineHeightFactor: 1.08 });
      cursorY += heading.length * fontSize * 1.1 + 1;
      setFont(doc, lang, false);
      doc.setTextColor(...TEXT);
      const description = doc.splitTextToSize(item.description, innerWidth);
      doc.text(description, x + 8, cursorY, { lineHeightFactor: 1.1 });
      cursorY += description.length * fontSize * 1.1 + 4;
    });
  }

  async function createAssessmentPdf(options) {
    const { jsPDF } = options.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
    await registerFonts(doc, options.lang, options.fontAssetBase);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 56.69;
    const marginY = 42.52;
    const contentWidth = pageWidth - marginX * 2;
    const gap = 8;

    setFont(doc, options.lang, true);
    doc.setTextColor(...PURPLE);
    doc.setFontSize(options.lang === "zh" ? 15 : 12.3);
    const titleLines = doc.splitTextToSize(options.t("pdf_report_title").toUpperCase(), contentWidth - 12);
    doc.text(titleLines.slice(0, 2), pageWidth / 2, marginY + 3, { align: "center", lineHeightFactor: 1.05 });

    let y = marginY + (titleLines.length > 1 ? 29 : 20);
    drawSectionTitle(doc, options.lang, options.t("pdf_general_information"), marginX, y, contentWidth);
    y += 23;
    const infoColumn = (contentWidth - 18) / 2;
    drawLabelValue(doc, options.lang, options.t("pdf_expert_id"), options.expertId, marginX + 3, y, infoColumn);
    drawLabelValue(doc, options.lang, options.t("pdf_date"), options.dateText, marginX + infoColumn + 18, y, infoColumn);
    drawLabelValue(doc, options.lang, options.t("pdf_company_name"), options.companyName, marginX + 3, y + 24, contentWidth - 6);
    drawLabelValue(doc, options.lang, options.t("pdf_role"), options.roleText, marginX + 3, y + 48, infoColumn);
    drawLabelValue(doc, options.lang, options.t("pdf_size"), options.sizeText, marginX + infoColumn + 18, y + 48, infoColumn);

    y += 74;
    drawSectionTitle(doc, options.lang, options.t("pdf_assessment_records"), marginX, y, contentWidth);
    y += 22;
    const scaleHeight = drawMaturityScale(doc, options.lang, options.scaleLevels, marginX, y, contentWidth);
    y += scaleHeight + 7;

    const leftWidth = 180;
    const rightWidth = contentWidth - leftWidth - gap;
    const overallGap = 7;
    const overallWidth = (leftWidth - overallGap) / 2;
    const recordHeight = 130;
    drawOverallCard(doc, options.lang, marginX, y, overallWidth, recordHeight, options.t("pdf_current_score"), options.overallCurrent, options.currentLevel);
    drawOverallCard(doc, options.lang, marginX + overallWidth + overallGap, y, overallWidth, recordHeight, options.t("pdf_target_score"), options.overallTarget, options.targetLevel);
    drawDomainTable(doc, {
      lang: options.lang,
      t: options.t,
      domains: options.domains,
      scores: options.domainScores
    }, marginX + leftWidth + gap, y, rightWidth, recordHeight);

    y += recordHeight + 10;
    drawSectionTitle(doc, options.lang, options.t("pdf_result_summary"), marginX, y, contentWidth);
    y += 23;
    const chartGap = 4;
    const chartWidth = (contentWidth - chartGap * 3) / 4;
    options.domains.forEach((domain, index) => {
      const x = marginX + index * (chartWidth + chartGap);
      setFont(doc, options.lang, true);
      doc.setTextColor(...PURPLE);
      doc.setFontSize(6.2);
      doc.text(domain.name, x + chartWidth / 2, y + 6, { align: "center", maxWidth: chartWidth - 3 });
      doc.addImage(chartToPng(options.domainCharts[domain.id], 420), "PNG", x, y + 8, chartWidth, chartWidth, undefined, "FAST");
    });
    y += chartWidth + 13;

    const availableBottomHeight = pageHeight - marginY - y;
    const summaryWidth = 146;
    const recommendationX = marginX + summaryWidth + gap;
    const recommendationWidth = contentWidth - summaryWidth - gap;
    const items = recommendationItems(options.currentLevel.index, options.targetLevel.index, options.recommendations, options.lang);
    setFont(doc, options.lang, false);
    const preferredLines = recommendationLineCount(doc, items, options.t("pdf_no_transition"), recommendationWidth - 16, 8.2);
    const preferredHeight = Math.max(112, Math.min(176, 30 + preferredLines * 8.2 * 1.16));
    const bottomHeight = Math.min(availableBottomHeight, preferredHeight);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BLUE);
    doc.roundedRect(marginX, y, summaryWidth, bottomHeight, 6, 6, "FD");
    setFont(doc, options.lang, true);
    doc.setTextColor(...BLUE);
    doc.setFontSize(7.4);
    doc.text(options.t("summary_radar_heading"), marginX + summaryWidth / 2, y + 13, { align: "center", maxWidth: summaryWidth - 10 });
    const summarySize = Math.min(summaryWidth - 10, bottomHeight - 24);
    doc.addImage(chartToPng(options.summaryChart, 520), "PNG", marginX + (summaryWidth - summarySize) / 2, y + 18, summarySize, summarySize, undefined, "FAST");

    drawRecommendations(doc, { lang: options.lang, t: options.t, items }, recommendationX, y, recommendationWidth, bottomHeight);

    if (doc.getNumberOfPages() !== 1) throw new Error("Assessment PDF must contain exactly one page.");
    return doc.output("blob");
  }

  window.WorkshopReport = { createAssessmentPdf };
})();
