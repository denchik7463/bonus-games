package com.game.service.lottery;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.scilab.forge.jlatexmath.TeXConstants;
import org.scilab.forge.jlatexmath.TeXFormula;
import org.scilab.forge.jlatexmath.TeXIcon;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LotteryReportService {

    public byte[] generate(
            Map<String, Object> result,
            double baseWeight,
            double boostBonus,
            double boostCost,
            double entryCost,
            double winnerPercent,
            int simRounds,
            String players,
            String boosted
    ) {
        Set<String> boostedSet = new HashSet<>(Arrays.stream(boosted.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet()));

        List<Player> playerList = new ArrayList<>();
        for (String name : players.split(",")) {
            String n = name.trim();
            if (!n.isEmpty()) {
                playerList.add(new Player(n, boostedSet.contains(n)));
            }
        }

        Config cfg = new Config();
        cfg.baseWeight = baseWeight;
        cfg.boostBonus = boostBonus;
        cfg.boostCost = boostCost;
        cfg.entryCost = entryCost;
        cfg.winnerPercent = winnerPercent;
        cfg.simRounds = simRounds;

        try {
            return PdfReportGenerator.generate(playerList, cfg, result);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate PDF report", ex);
        }
    }

    private static class Player {
        private final String name;
        private final boolean boost;

        private Player(String name, boolean boost) {
            this.name = name;
            this.boost = boost;
        }
    }

    private static class Config {
        private double baseWeight;
        private double boostBonus;
        private double boostCost;
        private double entryCost;
        private double winnerPercent;
        private int simRounds;
    }

    private static class PdfReportGenerator {

        private static final Color C_BG = new Color(0xF8, 0xF9, 0xFB);
        private static final Color C_CARD = new Color(0xF1, 0xF1, 0xF1);
        private static final Color C_CARD_ALT = new Color(0xE9, 0xE9, 0xE9);
        private static final Color C_ACCENT = new Color(0x2E, 0x5B, 0x8A);
        private static final Color C_TEXT = new Color(0x22, 0x22, 0x22);
        private static final Color C_TEXT_SOFT = new Color(0x5F, 0x5F, 0x5F);
        private static final Color C_BORDER = new Color(0xC8, 0xC8, 0xC8);
        private static final Color C_CHART = new Color(0x6C, 0x84, 0x9B);
        private static final Color C_ERR = new Color(0x77, 0x77, 0x77);
        private static final Color C_WARN = new Color(0x95, 0x95, 0x95);

        private static final float PW = PDRectangle.A4.getWidth();
        private static final float PH = PDRectangle.A4.getHeight();
        private static final float MARGIN = 36f;
        private static final float CW = PW - MARGIN * 2;

        private final PDDocument doc;
        private PDPage page;
        private PDPageContentStream cs;
        private float y;

        private final PDFont fRegular;
        private final PDFont fBold;
        private final PDFont fMono;

        private PdfReportGenerator(PDDocument doc) throws Exception {
            this.doc = doc;
            fRegular = loadUnicodeFont(doc, false);
            fBold = loadUnicodeFont(doc, true);
            fMono = loadUnicodeFont(doc, false);
        }

        @SuppressWarnings("unchecked")
        static byte[] generate(List<Player> players, Config cfg, Map<String, Object> result) throws Exception {
            try (PDDocument doc = new PDDocument()) {
                new PdfReportGenerator(doc).build(players, cfg, result);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                doc.save(baos);
                return baos.toByteArray();
            }
        }

        @SuppressWarnings("unchecked")
        private void build(List<Player> players, Config cfg, Map<String, Object> result) throws Exception {
            Map<String, Object> metrics = (Map<String, Object>) result.get("metrics");
            List<Map<String, Object>> warnings = (List<Map<String, Object>>) result.get("warnings");
            boolean blocked = Boolean.TRUE.equals(result.get("blocked"));
            double[] probs = toDoubleArr(result.get("probs"));
            double[] weights = toDoubleArr(result.get("weights"));
            String[] names = toStringArr(result.get("names"));
            Map<String, Integer> wins = (Map<String, Integer>) result.get("wins");

            long errCount = warnings.stream().filter(w -> "error".equals(w.get("level"))).count();
            long warnCount = warnings.stream().filter(w -> "warning".equals(w.get("level"))).count();

            newPage();

            float headerH = 74f;
            fillRect(MARGIN, y - headerH, CW, headerH, C_ACCENT);
            String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"));
            textCentered("Отчет по конфигурации лотереи", fBold, 18, Color.WHITE, y - 22);
            textCentered("Сформирован: " + ts, fRegular, 9, Color.WHITE, y - 38);
            String statusStr = blocked ? "ЗАПУСК ЗАБЛОКИРОВАН" : "КОНФИГУРАЦИЯ ДОПУСТИМА";
            textCentered(statusStr, fBold, 11, Color.WHITE, y - 56);
            y -= headerH + 10;

            float cardW = CW / 3f;
            drawCard(MARGIN, y, cardW, "Игроков", String.valueOf(players.size()), C_CARD);
            drawCard(MARGIN + cardW, y, cardW, "Блокирующих", String.valueOf(errCount), C_CARD);
            drawCard(MARGIN + cardW * 2, y, cardW, "Предупреждений", String.valueOf(warnCount), C_CARD);
            y -= 56;
            ensureSpace(34);
            wrappedText(
                    "Краткая интерпретация: сначала смотрите число блокирующих ошибок. Если оно больше нуля, конфигурация требует обязательной правки. " +
                            "Предупреждения не блокируют запуск, но показывают зоны риска для баланса, честности и экономики комнаты.",
                    fRegular, 8.8f, C_TEXT_SOFT, MARGIN, y, CW, 11f
            );
            y -= 28;

            sectionHeader("Параметры конфигурации");
            String playerNames = players.stream().map(p -> p.name).reduce((a, b) -> a + ", " + b).orElse("-");
            String boostedNames = players.stream().filter(p -> p.boost).map(p -> p.name).reduce((a, b) -> a + ", " + b).orElse("нет");
            String[][] cfgRows = {
                    {"Базовый вес (baseWeight)", fmt(cfg.baseWeight), "Базовый вклад игрока в формулу шанса"},
                    {"Бонус буста (boostBonus)", fmt(cfg.boostBonus), "Дополнительный вес при активном бусте"},
                    {"Цена буста (boostCost)", fmt(cfg.boostCost), "Доплата игрока за использование буста"},
                    {"Цена входа (entryCost)", fmt(cfg.entryCost), "Стоимость участия для каждого игрока"},
                    {"Выплата победителю (winnerPercent)", fmt(cfg.winnerPercent) + "%", "Доля общего пула, уходящая победителю"},
                    {"Раунды симуляции (simRounds)", String.valueOf(cfg.simRounds), "Количество прогонов симуляции побед"},
                    {"Игроки (players)", playerNames, "Список имен игроков, полученных в запросе"},
                    {"Игроки с бустом (boosted)", boostedNames, "Подмножество игроков с активным бустом"}
            };
            drawTable(new String[]{"Параметр", "Значение", "Пояснение"},
                    cfgRows, new float[]{CW * 0.32f, CW * 0.18f, CW * 0.50f}, new int[]{1});
            ensureSpace(30);
            wrappedText(
                    "Этот блок фиксирует исходные данные расчета. Любое изменение параметров напрямую влияет на вероятности, призовой фонд и предупреждения, " +
                            "поэтому при анализе спорных результатов сначала сверяйте именно эти значения.",
                    fRegular, 8.8f, C_TEXT_SOFT, MARGIN, y, CW, 11f
            );
            y -= 24;

            sectionHeader("Логика и формулы расчета");
            formulaBlock("Вес игрока",
                    new String[]{"weight[i] = baseWeight + (boost[i] ? boostBonus : 0)"},
                    "Каждый игрок начинает с базового веса. Если у игрока активирован буст, добавляется bonus буста.\nЧем больше вес, тем выше вероятность победы.");

            formulaBlock("Вероятность победы",
                    new String[]{"prob[i] = weight[i] / SUM( weight[j] )  for all j"},
                    "Шанс каждого игрока пропорционален его весу.\nПри равных весах вероятность каждого равна 1/N.");

            formulaBlock("Призовой фонд и общий пул",
                    new String[]{"totalEntry = entryCost x N", "prizePool  = totalEntry x (winnerPercent / 100)"},
                    "N - количество игроков. Призовой фонд - это доля общего пула взносов, выплачиваемая победителю.");

            formulaBlock("Прибыль и доля организатора",
                    new String[]{"houseProfit = totalEntry - prizePool", "houseMargin = houseProfit / totalEntry"},
                    "Доля организатора показывает, какую часть пула оставляет организатор.\nРекомендуемый диапазон: 10%-35%. При winnerPercent=80% доля организатора равна 20%.");

            formulaBlock("Ожидаемый результат и ROI игрока",
                    new String[]{
                            "cost[i]           = entryCost + (boost[i] ? boostCost : 0)",
                            "expectedProfit[i] = prob[i] x prizePool - cost[i]",
                            "ROI[i]            = (prob[i] x prizePool) / cost[i]"
                    },
                    "ROI < 1 означает, что игрок в среднем получает меньше вложенного.\nДля лотереи это допустимо, но значение ниже 0.75 считается критически низким.");

            formulaBlock("Влияние буста (метрика pay-to-win)",
                    new String[]{
                            "lift[i]          = max(0, prob[i] - 1/N)  -- boosted players only",
                            "boostImpactShare = AVG( lift[i] )"
                    },
                    "Показывает, насколько буст уводит шансы от равного распределения.\nЗначение выше 10% формирует выраженный эффект pay-to-win.");

            formulaBlock("Эффективность буста к цене",
                    new String[]{
                            "avgLift    = AVG( lift[i] )  for boosted players",
                            "efficiency = (avgLift x prizePool) / (entryCost + boostCost)"
                    },
                    "Отношение дополнительной ожидаемой выгоды к сумме цены входа и буста.\nРабочий диапазон: 5%-10%. Ниже - буст невыгоден, выше - буст слишком сильный.");
            y -= 10;

            sectionHeader("Формулы теории вероятностей (общий вид)");
            formulaBlockLatex("Нормировка вероятностей",
                    new String[]{"sum(P_i)=1", "P_i = w_i / sum(w_k)"},
                    "Это базовая формула дискретного распределения: вероятность события равна его весу, деленному на сумму всех весов.");

            formulaBlockLatex("Математическое ожидание выигрыша игрока",
                    new String[]{"E[X_i] = P_i * S", "E[Pi_i] = E[X_i] - C_i"},
                    "E[X_i] - ожидаемый выигрыш, E[П_i] - ожидаемая прибыль игрока, S - призовой фонд, C_i - его суммарная стоимость участия.");

            formulaBlockLatex("ROI в общем виде",
                    new String[]{"ROI_i = (P_i * S) / C_i", "ROI_avg = (1/N) * sum(ROI_i)"},
                    "ROI показывает, сколько ожидаемой ценности приходится на единицу стоимости участия.");

            sectionHeader("Ключевые метрики");
            String[][] metRows = {
                    {"Сумма входов", fmtVal(metrics, "totalEntry") + " бонусов"},
                    {"Призовой фонд", fmtVal(metrics, "prizePool") + " бонусов"},
                    {"Прибыль организатора", fmtVal(metrics, "houseProfit") + " бонусов"},
                    {"Процент организатора", pct(metrics, "houseMargin")},
                    {"Средний ROI игроков", fmtVal(metrics, "averagePlayerROI")},
                    {"Минимальный ROI", fmtVal(metrics, "minPlayerROI")},
                    {"Доля игроков с отриц. ожиданием", pct(metrics, "unprofitableShare")},
                    {"Влияние буста", pct(metrics, "boostImpactShare")},
                    {"Эффективность буста к цене входа+буста", pct(metrics, "boostEfficiencyVsCosts")}
            };
            drawTable(new String[]{"Метрика", "Значение"}, metRows, new float[]{CW * 0.65f, CW * 0.35f}, new int[]{1});

            sectionHeader("Игроки и вероятности победы");
            List<String[]> pRows = new ArrayList<>();
            for (int i = 0; i < names.length; i++) {
                String wStr = (wins != null && wins.containsKey(names[i]))
                        ? wins.get(names[i]) + " / " + cfg.simRounds
                        : blocked ? "заблокировано" : "0";
                pRows.add(new String[]{
                        names[i],
                        players.get(i).boost ? "Да" : "Нет",
                        fmt(weights[i]),
                        String.format("%.2f%%", probs[i] * 100),
                        wStr
                });
            }
            drawTable(new String[]{"Игрок", "Буст", "Вес", "Вероятность", "Победы (сим.)"},
                    pRows.toArray(new String[0][]),
                    new float[]{CW * 0.28f, CW * 0.10f, CW * 0.14f, CW * 0.18f, CW * 0.30f},
                    new int[]{1, 2, 3, 4});

            sectionHeader("Гистограмма побед (по симуляции)");
            if (wins != null && !wins.isEmpty() && !blocked) {
                drawWinsHistogram(wins, cfg.simRounds);
            } else {
                formulaBlock("Нет данных для гистограммы",
                        new String[]{"blocked = true => wins = empty"},
                        "Симуляция не выполнялась из-за блокирующих предупреждений, поэтому гистограмма недоступна.");
            }

            if (!warnings.isEmpty()) {
                sectionHeader("Предупреждения и блокировки");
                for (Map<String, Object> w : warnings) {
                    warningBlock(w);
                }
            }

            if (cs != null) {
                cs.close();
            }
        }

        private void newPage() throws Exception {
            if (cs != null) {
                cs.close();
            }
            page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            cs = new PDPageContentStream(doc, page);
            fill(C_BG);
            cs.addRect(0, 0, PW, PH);
            cs.fill();
            y = PH - MARGIN;
        }

        private void ensureSpace(float need) throws Exception {
            if (y - need < MARGIN + 20) {
                newPage();
            }
        }

        private void fill(Color c) throws Exception {
            cs.setNonStrokingColor(c);
        }

        private void stroke(Color c) throws Exception {
            cs.setStrokingColor(c);
        }

        private void fillRect(float x, float rectY, float w, float h, Color c) throws Exception {
            fill(c);
            cs.addRect(x, rectY, w, h);
            cs.fill();
        }

        private void text(String s, PDFont font, float size, Color color, float x, float baseY) throws Exception {
            fill(color);
            cs.beginText();
            cs.setFont(font, size);
            cs.newLineAtOffset(x, baseY);
            cs.showText(ascii(s));
            cs.endText();
        }

        private void textCentered(String s, PDFont font, float size, Color color, float baseY) throws Exception {
            float w = font.getStringWidth(ascii(s)) / 1000f * size;
            text(s, font, size, color, (PW - w) / 2f, baseY);
        }

        private void leftBar(float x, float rectY, float h, Color c) throws Exception {
            fillRect(x, rectY, 3f, h, c);
        }

        private void sectionHeader(String title) throws Exception {
            ensureSpace(28);
            y -= 12;
            text(title, fBold, 13, C_TEXT, MARGIN, y);
            y -= 5;
            stroke(C_ACCENT);
            cs.setLineWidth(0.8f);
            cs.moveTo(MARGIN, y);
            cs.lineTo(MARGIN + CW, y);
            cs.stroke();
            y -= 8;
        }

        private void drawCard(float x, float topY, float w, String label, String value, Color bg) throws Exception {
            float h = 50f;
            fillRect(x, topY - h, w - 2, h, bg);
            stroke(C_BORDER);
            cs.addRect(x, topY - h, w - 2, h);
            cs.stroke();
            float vs = 20f;
            float vw = fBold.getStringWidth(ascii(value)) / 1000f * vs;
            text(value, fBold, vs, C_TEXT, x + (w - vw) / 2f - 1, topY - 22);
            float ls = 8f;
            float lw = fRegular.getStringWidth(ascii(label)) / 1000f * ls;
            text(label, fRegular, ls, C_TEXT_SOFT, x + (w - lw) / 2f - 1, topY - 38);
        }

        private void drawTable(String[] headers, String[][] rows, float[] colW, int[] monoColumns) throws Exception {
            Set<Integer> mono = new HashSet<>();
            for (int mc : monoColumns) {
                mono.add(mc);
            }
            float rH = 18f;
            float pad = 4f;

            ensureSpace(rH + 4);
            fillRect(MARGIN, y - rH, CW, rH, C_ACCENT);
            float cx = MARGIN;
            for (int c = 0; c < headers.length; c++) {
                text(headers[c], fBold, 8.5f, Color.WHITE, cx + pad, y - rH + pad + 2);
                cx += colW[c];
            }
            y -= rH;

            for (int r = 0; r < rows.length; r++) {
                ensureSpace(rH);
                fillRect(MARGIN, y - rH, CW, rH, r % 2 == 0 ? C_CARD : C_CARD_ALT);
                cx = MARGIN;
                for (int c = 0; c < rows[r].length; c++) {
                    boolean isMono = mono.contains(c);
                    text(rows[r][c],
                            isMono ? fMono : fRegular,
                            isMono ? 8f : 8.5f,
                            C_TEXT,
                            cx + pad, y - rH + pad + 2);
                    cx += colW[c];
                }
                y -= rH;
            }
            y -= 6;
        }

        private void formulaBlock(String title, String[] formulaLines, String explanation) throws Exception {
            float lineH = 13f;
            float pad = 7f;
            int expLns = countLines(explanation, CW - 22, 8.5f, fRegular);
            float blockH = pad + lineH + formulaLines.length * lineH + expLns * 11f + pad + 2;

            ensureSpace(blockH + 6);
            float top = y;
            fillRect(MARGIN, top - blockH, CW, blockH, C_CARD);
            leftBar(MARGIN, top - blockH, blockH, C_ACCENT);

            float tx = MARGIN + 10;
            float ty = top - pad - lineH + 3;
            text(title, fBold, 10, C_TEXT, tx, ty);
            ty -= lineH;
            for (String line : formulaLines) {
                text(line, fMono, 8, C_TEXT, tx, ty);
                ty -= lineH;
            }
            ty -= 2;
            wrappedText(explanation, fRegular, 8.5f, C_TEXT_SOFT, tx, ty, CW - 22, 11f);
            y = top - blockH - 5;
        }

        private void formulaBlockLatex(String title, String[] latexLines, String explanation) throws Exception {
            float lineH = 13f;
            float pad = 7f;
            int expLns = countLines(explanation, CW - 22, 8.5f, fRegular);
            float latexTotalH = 0f;
            for (String latex : latexLines) {
                latexTotalH += estimateLatexFormulaHeight(latex, CW - 22) + 6f;
            }
            float blockH = pad + lineH + latexTotalH + expLns * 11f + pad + 6;

            ensureSpace(blockH + 6);
            float top = y;
            fillRect(MARGIN, top - blockH, CW, blockH, C_CARD);
            leftBar(MARGIN, top - blockH, blockH, C_ACCENT);

            float tx = MARGIN + 10;
            float ty = top - pad - lineH + 3;
            text(title, fBold, 10, C_TEXT, tx, ty);
            ty -= lineH + 1;

            for (String latex : latexLines) {
                float usedH = drawLatexFormula(latex, tx, ty + 2, CW - 22);
                ty -= usedH + 6;
            }

            wrappedText(explanation, fRegular, 8.5f, C_TEXT_SOFT, tx, ty, CW - 22, 11f);
            y = top - blockH - 5;
        }

        private float drawLatexFormula(String latex, float x, float topY, float maxW) throws Exception {
            try {
                TeXFormula formula = new TeXFormula(latex);
                TeXIcon icon = formula.createTeXIcon(TeXConstants.STYLE_DISPLAY, 15f);

                int srcW = Math.max(1, icon.getIconWidth());
                int srcH = Math.max(1, icon.getIconHeight());
                float fitScale = srcW > maxW ? (maxW / srcW) : 1f;
                int targetW = Math.max(1, Math.round(srcW * fitScale));
                int targetH = Math.max(1, Math.round(srcH * fitScale));

                int ss = 3;
                int renderW = Math.max(1, targetW * ss);
                int renderH = Math.max(1, targetH * ss);
                BufferedImage img = new BufferedImage(renderW, renderH, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g2 = img.createGraphics();
                g2.setColor(new Color(0, 0, 0, 0));
                g2.fillRect(0, 0, renderW, renderH);
                g2.setColor(C_TEXT);
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g2.scale(fitScale * ss, fitScale * ss);
                icon.paintIcon(null, g2, 0, 0);
                g2.dispose();

                PDImageXObject pdImage = LosslessFactory.createFromImage(doc, img);
                cs.drawImage(pdImage, x, topY - targetH, targetW, targetH);
                return targetH;
            } catch (Exception e) {
                text(latex, fRegular, 9, C_TEXT, x, topY - 2);
                return 12f;
            }
        }

        private float estimateLatexFormulaHeight(String latex, float maxW) {
            try {
                TeXFormula formula = new TeXFormula(latex);
                TeXIcon icon = formula.createTeXIcon(TeXConstants.STYLE_DISPLAY, 15f);
                int srcW = Math.max(1, icon.getIconWidth());
                int srcH = Math.max(1, icon.getIconHeight());
                float fitScale = srcW > maxW ? (maxW / srcW) : 1f;
                return Math.max(16f, srcH * fitScale);
            } catch (Exception ignored) {
                return 14f;
            }
        }

        private void drawWinsHistogram(Map<String, Integer> wins, int rounds) throws Exception {
            float barX = MARGIN + 210f;
            float rightPad = 10f;
            float barAreaW = Math.max(60f, (MARGIN + CW) - barX - rightPad);
            float rowH = 18f;
            float headerH = 18f;
            int rows = wins.size();
            float blockH = headerH + rows * rowH + 20f;
            ensureSpace(blockH + 8);

            float top = y;
            fillRect(MARGIN, top - blockH, CW, blockH, C_CARD);
            stroke(C_BORDER);
            cs.addRect(MARGIN, top - blockH, CW, blockH);
            cs.stroke();

            text("Игрок", fBold, 9, C_TEXT, MARGIN + 8, top - 13);
            text("Победы", fBold, 9, C_TEXT, MARGIN + 92, top - 13);
            text("Доля", fBold, 9, C_TEXT, MARGIN + 152, top - 13);
            text("Гистограмма", fBold, 9, C_TEXT, MARGIN + 210, top - 13);

            int max = wins.values().stream().max(Integer::compareTo).orElse(1);
            float yRow = top - headerH - 10;

            for (Map.Entry<String, Integer> e : wins.entrySet()) {
                String name = e.getKey();
                int value = e.getValue();
                double pct = rounds > 0 ? (double) value / rounds : 0;

                text(name, fRegular, 8.5f, C_TEXT, MARGIN + 8, yRow);
                text(String.valueOf(value), fRegular, 8.5f, C_TEXT, MARGIN + 92, yRow);
                text(String.format("%.2f%%", pct * 100), fRegular, 8.5f, C_TEXT, MARGIN + 152, yRow);

                float barY = yRow - 7;
                float w = max > 0 ? (value / (float) max) * barAreaW : 0;
                fillRect(barX, barY, barAreaW, 8, C_CARD_ALT);
                fillRect(barX, barY, w, 8, C_CHART);

                yRow -= rowH;
            }

            y = top - blockH - 8;
        }

        private void warningBlock(Map<String, Object> w) throws Exception {
            boolean isErr = "error".equals(w.get("level"));
            Color border = isErr ? C_ERR : C_WARN;

            String levelLabel = isErr ? "[БЛОК]" : "[ПРЕДУПРЕЖДЕНИЕ]";
            String code = "[" + String.valueOf(w.get("code")) + "]";
            String title = String.valueOf(w.get("title"));
            String message = String.valueOf(w.get("message"));

            int msgLns = countLines(message, CW - 22, 8.5f, fRegular);
            float blockH = 8 + 12 + 14 + msgLns * 11f + 8;

            ensureSpace(blockH + 6);
            float top = y;
            fillRect(MARGIN, top - blockH, CW, blockH, C_CARD);
            leftBar(MARGIN, top - blockH, blockH, border);

            float tx = MARGIN + 10;
            float ty = top - 10 - 9;
            text(levelLabel + "  " + code, fBold, 8, C_TEXT, tx, ty);
            ty -= 13;
            text(title, fBold, 10, C_TEXT, tx, ty);
            ty -= 13;
            wrappedText(message, fRegular, 8.5f, C_TEXT_SOFT, tx, ty, CW - 22, 11f);
            y = top - blockH - 5;
        }

        private float wrappedText(String text, PDFont font, float size, Color color,
                                  float x, float startY, float maxW, float lineH) throws Exception {
            float cy = startY;
            for (String para : text.split("\\n")) {
                for (String line : wrapLine(para, font, size, maxW)) {
                    text(line, font, size, color, x, cy);
                    cy -= lineH;
                }
            }
            return cy;
        }

        private List<String> wrapLine(String text, PDFont font, float size, float maxW) throws Exception {
            List<String> res = new ArrayList<>();
            StringBuilder cur = new StringBuilder();
            for (String word : text.split(" ")) {
                String test = cur.length() == 0 ? word : cur + " " + word;
                if (font.getStringWidth(ascii(test)) / 1000f * size > maxW && cur.length() > 0) {
                    res.add(cur.toString());
                    cur = new StringBuilder(word);
                } else {
                    cur = new StringBuilder(test);
                }
            }
            if (cur.length() > 0) {
                res.add(cur.toString());
            }
            return res.isEmpty() ? Collections.singletonList("") : res;
        }

        private int countLines(String text, float maxW, float size, PDFont font) {
            int total = 0;
            for (String para : text.split("\\n")) {
                try {
                    total += wrapLine(para, font, size, maxW).size();
                } catch (Exception e) {
                    total += 1;
                }
            }
            return Math.max(total, 1);
        }

        private static PDFont loadUnicodeFont(PDDocument doc, boolean bold) throws Exception {
            String[] candidates = bold
                    ? new String[]{
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
                    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
                    "/System/Library/Fonts/Supplemental/Helvetica.ttc"
            }
                    : new String[]{
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
                    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
                    "/System/Library/Fonts/Supplemental/Arial.ttf",
                    "/System/Library/Fonts/Supplemental/Helvetica.ttc"
            };
            for (String p : candidates) {
                Path path = Paths.get(p);
                if (Files.exists(path)) {
                    try (InputStream is = Files.newInputStream(path)) {
                        return PDType0Font.load(doc, is, true);
                    } catch (Exception ignored) {
                    }
                }
            }
            return bold
                    ? new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)
                    : new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        }

        private static String ascii(String s) {
            return s == null ? "" : s;
        }

        private static String fmt(double v) {
            return String.format("%.2f", v);
        }

        private static String fmtVal(Map<String, Object> m, String key) {
            Object v = m.get(key);
            return v == null ? "-" : String.format("%.2f", ((Number) v).doubleValue());
        }

        private static String pct(Map<String, Object> m, String key) {
            Object v = m.get(key);
            return v == null ? "-" : String.format("%.2f%%", ((Number) v).doubleValue() * 100);
        }

        private static double[] toDoubleArr(Object o) {
            if (o instanceof double[] arr) {
                return arr;
            }
            if (o instanceof List<?> l) {
                double[] a = new double[l.size()];
                for (int i = 0; i < l.size(); i++) {
                    a[i] = ((Number) l.get(i)).doubleValue();
                }
                return a;
            }
            return new double[0];
        }

        private static String[] toStringArr(Object o) {
            if (o instanceof String[] arr) {
                return arr;
            }
            if (o instanceof List<?> l) {
                return l.stream().map(Object::toString).toArray(String[]::new);
            }
            return new String[0];
        }
    }
}
