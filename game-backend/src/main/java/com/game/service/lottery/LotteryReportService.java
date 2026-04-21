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

        // ─── Palette ───────────────────────────────────────────────────────────
        // Pure white background – no tints, no off-white fills
        private static final Color C_WHITE      = Color.WHITE;
        // Single accent: dark navy used for header bar, section rules, table headers, left bars
        private static final Color C_ACCENT     = new Color(0x1A, 0x3A, 0x5C);
        // Accent variant for chart bars (lighter blue)
        private static final Color C_ACCENT_LT  = new Color(0x3A, 0x6E, 0xA8);
        // Primary text
        private static final Color C_TEXT       = new Color(0x11, 0x11, 0x11);
        // Secondary / caption text
        private static final Color C_TEXT_MUTED = new Color(0x66, 0x66, 0x66);
        // Table row separator and borders – thin, light
        private static final Color C_RULE       = new Color(0xD8, 0xD8, 0xD8);
        // Alternate row fill – barely-there grey, no visible shade
        private static final Color C_ROW_ALT    = new Color(0xF7, 0xF7, 0xF7);
        // Error badge foreground
        private static final Color C_ERR        = new Color(0xB0, 0x20, 0x20);
        // Warning badge foreground
        private static final Color C_WARN       = new Color(0x8A, 0x60, 0x00);

        // ─── Layout constants ──────────────────────────────────────────────────
        private static final float PW     = PDRectangle.A4.getWidth();
        private static final float PH     = PDRectangle.A4.getHeight();
        private static final float MARGIN = 40f;
        private static final float CW     = PW - MARGIN * 2;

        // ─── State ─────────────────────────────────────────────────────────────
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
            fBold    = loadUnicodeFont(doc, true);
            fMono    = fRegular; // same face, used at smaller size for code
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Entry point
        // ───────────────────────────────────────────────────────────────────────
        @SuppressWarnings("unchecked")
        static byte[] generate(List<Player> players, Config cfg, Map<String, Object> result) throws Exception {
            try (PDDocument doc = new PDDocument()) {
                new PdfReportGenerator(doc).build(players, cfg, result);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                doc.save(baos);
                return baos.toByteArray();
            }
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Document assembly
        // ───────────────────────────────────────────────────────────────────────
        @SuppressWarnings("unchecked")
        private void build(List<Player> players, Config cfg, Map<String, Object> result) throws Exception {
            Map<String, Object> metrics = (Map<String, Object>) result.get("metrics");
            List<Map<String, Object>> warnings = (List<Map<String, Object>>) result.get("warnings");
            boolean blocked   = Boolean.TRUE.equals(result.get("blocked"));
            double[] probs    = toDoubleArr(result.get("probs"));
            double[] weights  = toDoubleArr(result.get("weights"));
            String[] names    = toStringArr(result.get("names"));
            Map<String, Integer> wins = (Map<String, Integer>) result.get("wins");

            long errCount  = warnings.stream().filter(w -> "error".equals(w.get("level"))).count();
            long warnCount = warnings.stream().filter(w -> "warning".equals(w.get("level"))).count();

            newPage();

            // ── Header – plain text, no background bar ────────────────────────
            String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"));
            textCentered("Отчет по конфигурации лотереи", fBold, 20, C_TEXT, y - 10);
            y -= 28;
            hRule(C_ACCENT, 1.5f);
            y -= 10;
            text("Дата формирования: " + ts, fRegular, 8.5f, C_TEXT_MUTED, MARGIN, y);
            String statusStr = blocked ? "Статус: ЗАПУСК ЗАБЛОКИРОВАН" : "Статус: КОНФИГУРАЦИЯ ДОПУСТИМА";
            Color statusColor = blocked ? C_ERR : new Color(0x1A, 0x70, 0x40);
            float statusW = fBold.getStringWidth(ascii(statusStr)) / 1000f * 8.5f;
            text(statusStr, fBold, 8.5f, statusColor, MARGIN + CW - statusW, y);
            y -= 20;

            // ── Summary strip (3 inline KPI cells, no filled background) ──────
            float cellW = CW / 3f;
            kpiCell(MARGIN,           y, cellW, "Игроков",        String.valueOf(players.size()));
            kpiCell(MARGIN + cellW,   y, cellW, "Блокирующих",    String.valueOf(errCount));
            kpiCell(MARGIN + cellW*2, y, cellW, "Предупреждений", String.valueOf(warnCount));
            y -= 48;

            // ── Annotation ────────────────────────────────────────────────────
            y -= 10;
            ensureSpace(50);
            float annoEnd = wrappedText(
                    "Краткая интерпретация: сначала смотрите число блокирующих ошибок. " +
                            "Если оно больше нуля, конфигурация требует обязательной правки. " +
                            "Предупреждения не блокируют запуск, но показывают зоны риска " +
                            "для баланса, честности и экономики комнаты.",
                    fRegular, 8.5f, C_TEXT_MUTED, MARGIN, y, CW, 12f
            );
            y = annoEnd - 16;

            // ── Sections ──────────────────────────────────────────────────────
            sectionHeader("Параметры конфигурации");
            String playerNames  = players.stream().map(p -> p.name).reduce((a, b) -> a + ", " + b).orElse("-");
            String boostedNames = players.stream().filter(p -> p.boost).map(p -> p.name)
                    .reduce((a, b) -> a + ", " + b).orElse("нет");
            // Fixed-height rows (col widths: param 32%, value 18%, note 50%)
            float[] cfgColW = {CW * 0.32f, CW * 0.18f, CW * 0.50f};
            String[][] cfgRowsSimple = {
                    {"Базовый вес (baseWeight)",           fmt(cfg.baseWeight),          "Базовый вклад игрока в формулу шанса"},
                    {"Бонус буста (boostBonus)",           fmt(cfg.boostBonus),           "Дополнительный вес при активном бусте"},
                    {"Цена буста (boostCost)",             fmt(cfg.boostCost),            "Доплата игрока за использование буста"},
                    {"Цена входа (entryCost)",             fmt(cfg.entryCost),            "Стоимость участия для каждого игрока"},
                    {"Выплата победителю (winnerPercent)", fmt(cfg.winnerPercent) + "%",  "Доля общего пула, уходящая победителю"},
                    {"Раунды симуляции (simRounds)",       String.valueOf(cfg.simRounds), "Количество прогонов симуляции побед"}
            };
            drawTable(new String[]{"Параметр", "Значение", "Пояснение"},
                    cfgRowsSimple, cfgColW, new int[]{1});
            // Wrap-aware rows for long player lists
            drawWrappedRow("Игроки (players)",    playerNames,  "Список игроков из запроса",              cfgColW);
            drawWrappedRow("Игроки с бустом (boosted)", boostedNames, "Подмножество игроков с активным бустом", cfgColW);
            y -= 6;

            ensureSpace(42);
            float afterNote = wrappedText(
                    "Этот блок фиксирует исходные данные расчета. Любое изменение параметров напрямую влияет " +
                            "на вероятности, призовой фонд и предупреждения, поэтому при анализе спорных результатов " +
                            "сначала сверяйте именно эти значения.",
                    fRegular, 8.5f, C_TEXT_MUTED, MARGIN, y, CW, 12f
            );
            y = afterNote - 14;

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

            newPage();
            sectionHeader("Ключевые метрики");
            String[][] metRows = {
                    {"Сумма входов",                          fmtVal(metrics, "totalEntry") + " бонусов"},
                    {"Призовой фонд",                         fmtVal(metrics, "prizePool") + " бонусов"},
                    {"Прибыль организатора",                  fmtVal(metrics, "houseProfit") + " бонусов"},
                    {"Процент организатора",                  pct(metrics, "houseMargin")},
                    {"Средний ROI игроков",                   fmtVal(metrics, "averagePlayerROI")},
                    {"Минимальный ROI",                       fmtVal(metrics, "minPlayerROI")},
                    {"Доля игроков с отриц. ожиданием",       pct(metrics, "unprofitableShare")},
                    {"Влияние буста",                         pct(metrics, "boostImpactShare")},
                    {"Эффективность буста к цене входа+буста",pct(metrics, "boostEfficiencyVsCosts")}
            };
            drawTable(new String[]{"Метрика", "Значение"}, metRows,
                    new float[]{CW * 0.65f, CW * 0.35f}, new int[]{1});

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

            newPage();
            sectionHeader("Гистограмма побед (по симуляции)");
            if (wins != null && !wins.isEmpty() && !blocked) {
                drawWinsHistogram(wins, cfg.simRounds);
            } else {
                formulaBlock("Нет данных для гистограммы",
                        new String[]{"blocked = true  =>  wins = empty"},
                        "Симуляция не выполнялась из-за блокирующих предупреждений.");
            }

            if (!warnings.isEmpty()) {
                sectionHeader("Предупреждения и блокировки");
                for (Map<String, Object> w : warnings) {
                    warningBlock(w);
                }
            }

            // ── Footer rule on last page ───────────────────────────────────────
            ensureSpace(24);
            y -= 14;
            hRule(C_RULE, 0.5f);
            text("Lottery Report Service  —  сгенерировано автоматически", fRegular, 7.5f, C_TEXT_MUTED,
                    MARGIN, y - 10);

            if (cs != null) cs.close();
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Wins histogram
        //  Layout: clean row list, no background fills – just a thin border table
        // ───────────────────────────────────────────────────────────────────────
        private void drawWinsHistogram(Map<String, Integer> wins, int rounds) throws Exception {
            float barX     = MARGIN + 210f;
            float rightPad = 10f;
            float barAreaW = Math.max(60f, (MARGIN + CW) - barX - rightPad);
            float rowH     = 18f;
            float headerH  = 18f;
            int   rows     = wins.size();
            // blockH includes header + all data rows + bottom padding
            float blockH   = headerH + rows * rowH + 10f;

            ensureSpace(blockH + 10);
            // Reserve a small gap so the header doesn't touch whatever is above
            y -= 4;
            float top = y;

            // outer border
            strokeRect(MARGIN, top - blockH, CW, blockH, C_RULE, 0.5f);

            // header row – positioned at the very top of the block
            fillRect(MARGIN, top - headerH, CW, headerH, C_ACCENT);
            float hTextY = top - headerH + headerH * 0.35f;
            text("Игрок",       fBold, 8.5f, C_WHITE, MARGIN + 8,   hTextY);
            text("Победы",      fBold, 8.5f, C_WHITE, MARGIN + 92,  hTextY);
            text("Доля",        fBold, 8.5f, C_WHITE, MARGIN + 152, hTextY);
            text("Гистограмма", fBold, 8.5f, C_WHITE, MARGIN + 210, hTextY);

            int   max  = wins.values().stream().max(Integer::compareTo).orElse(1);
            // yRow points to the TOP of the first data row (just below header bottom)
            float yRow = top - headerH;
            int   idx  = 0;

            for (Map.Entry<String, Integer> e : wins.entrySet()) {
                String name  = e.getKey();
                int    value = e.getValue();
                double pct   = rounds > 0 ? (double) value / rounds : 0;

                // alternating row background
                if (idx % 2 == 1) fillRect(MARGIN, yRow - rowH, CW, rowH, C_ROW_ALT);

                // text baseline = row top - (rowH - font ascent) / 2, approx rowH*0.35 from bottom
                float textY = yRow - rowH + rowH * 0.35f;
                text(name,                              fRegular, 8.5f, C_TEXT,       MARGIN + 8,   textY);
                text(String.valueOf(value),             fRegular, 8.5f, C_TEXT,       MARGIN + 92,  textY);
                text(String.format("%.2f%%", pct*100), fRegular, 8.5f, C_TEXT_MUTED, MARGIN + 152, textY);

                // bar vertically centered in the row
                float barH = 6f;
                float barY = yRow - rowH + (rowH - barH) / 2f;
                float barW = max > 0 ? (value / (float) max) * barAreaW : 0;
                fillRect(barX, barY, barAreaW, barH, C_RULE);
                fillRect(barX, barY, barW,     barH, C_ACCENT_LT);

                // row bottom separator
                stroke(C_RULE);
                cs.setLineWidth(0.3f);
                cs.moveTo(MARGIN, yRow - rowH);
                cs.lineTo(MARGIN + CW, yRow - rowH);
                cs.stroke();

                yRow -= rowH;
                idx++;
            }

            y = top - blockH - 10;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Warning block
        //  Design: left-border accent only, no background fill
        // ───────────────────────────────────────────────────────────────────────
        private void warningBlock(Map<String, Object> w) throws Exception {
            boolean isErr   = "error".equals(w.get("level"));
            Color   accent  = isErr ? C_ERR : C_WARN;

            String levelLabel = isErr ? "[БЛОК]" : "[ПРЕДУПРЕЖДЕНИЕ]";
            String code  = "[" + w.get("code") + "]";
            String title = String.valueOf(w.get("title"));
            String msg   = String.valueOf(w.get("message"));

            int   msgLns = countLines(msg, CW - 24, 8.5f, fRegular);
            float blockH = 10 + 13 + 14 + msgLns * 12f + 10;

            ensureSpace(blockH + 8);
            float top = y;

            // very subtle background for readability
            fillRect(MARGIN, top - blockH, CW, blockH, C_ROW_ALT);
            // left accent bar (3px)
            fillRect(MARGIN, top - blockH, 3f, blockH, accent);
            // outer border
            strokeRect(MARGIN, top - blockH, CW, blockH, C_RULE, 0.4f);

            float tx = MARGIN + 12;
            float ty = top - 12 - 8;

            // Badge: colored label + code in muted text
            text(levelLabel, fBold, 7.5f, accent, tx, ty);
            float labelW = fBold.getStringWidth(ascii(levelLabel)) / 1000f * 7.5f;
            text("  " + code, fRegular, 7.5f, C_TEXT_MUTED, tx + labelW, ty);
            ty -= 14;

            text(title, fBold, 9.5f, C_TEXT, tx, ty);
            ty -= 14;

            wrappedText(msg, fRegular, 8.5f, C_TEXT_MUTED, tx, ty, CW - 24, 12f);
            y = top - blockH - 6;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Section header  –  bold label + full-width rule
        // ───────────────────────────────────────────────────────────────────────
        private void sectionHeader(String title) throws Exception {
            ensureSpace(30);
            y -= 14;
            text(title, fBold, 11f, C_TEXT, MARGIN, y);
            y -= 6;
            hRule(C_ACCENT, 1.0f);
            y -= 8;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  KPI cell  –  white bg, thin border, large number, small label
        // ───────────────────────────────────────────────────────────────────────
        private void kpiCell(float x, float topY, float w, String label, String value) throws Exception {
            float h = 42f;
            strokeRect(x, topY - h, w - 4, h, C_RULE, 0.5f);

            float vs = 18f;
            float vw = fBold.getStringWidth(ascii(value)) / 1000f * vs;
            text(value, fBold, vs, C_TEXT, x + (w - vw) / 2f - 2, topY - 18);

            float ls = 7.5f;
            float lw = fRegular.getStringWidth(ascii(label)) / 1000f * ls;
            text(label, fRegular, ls, C_TEXT_MUTED, x + (w - lw) / 2f - 2, topY - 33);
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Table  –  white body, accent header row, thin grid lines
        // ───────────────────────────────────────────────────────────────────────
        private void drawTable(String[] headers, String[][] rows, float[] colW, int[] monoColumns) throws Exception {
            Set<Integer> mono = new HashSet<>();
            for (int mc : monoColumns) mono.add(mc);

            float rH  = 17f;
            float pad = 5f;

            // ── Header row ──────────────────────────────────────────────────
            ensureSpace(rH + 4);
            fillRect(MARGIN, y - rH, CW, rH, C_ACCENT);

            float cx = MARGIN;
            for (int c = 0; c < headers.length; c++) {
                text(headers[c], fBold, 8f, C_WHITE, cx + pad, y - rH + pad + 1);
                cx += colW[c];
            }
            // vertical column separators in header
            cx = MARGIN + colW[0];
            for (int c = 1; c < headers.length; c++) {
                stroke(new Color(0x44, 0x66, 0x88));
                cs.setLineWidth(0.4f);
                cs.moveTo(cx, y - rH + 2);
                cs.lineTo(cx, y - 2);
                cs.stroke();
                if (c < headers.length - 1) cx += colW[c];
            }
            y -= rH;

            // ── Data rows ───────────────────────────────────────────────────
            for (int r = 0; r < rows.length; r++) {
                ensureSpace(rH);

                if (r % 2 == 1) fillRect(MARGIN, y - rH, CW, rH, C_ROW_ALT);

                cx = MARGIN;
                for (int c = 0; c < rows[r].length; c++) {
                    boolean isMono = mono.contains(c);
                    text(rows[r][c],
                            isMono ? fMono : fRegular,
                            isMono ? 7.5f : 8f,
                            C_TEXT,
                            cx + pad, y - rH + pad + 1);
                    cx += colW[c];
                }

                // bottom rule
                stroke(C_RULE);
                cs.setLineWidth(0.3f);
                cs.moveTo(MARGIN, y - rH);
                cs.lineTo(MARGIN + CW, y - rH);
                cs.stroke();

                y -= rH;
            }

            // outer border
            stroke(C_RULE);
            cs.setLineWidth(0.5f);
            cs.addRect(MARGIN, y, CW, rH * (rows.length + 1));
            cs.stroke();

            y -= 8;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Wrap-aware table row: renders a single 3-column row where col[1]
        //  (the value) may span multiple lines due to text wrapping.
        //  Used for "players" and "boosted" rows with potentially long content.
        // ───────────────────────────────────────────────────────────────────────
        private void drawWrappedRow(String param, String value, String note, float[] colW) throws Exception {
            float pad  = 5f;
            float lineH = 12f;
            float minH  = 17f;

            List<String> valueLines = wrapLine(value, fRegular, 8f, colW[1] - pad * 2);
            List<String> noteLines  = wrapLine(note,  fRegular, 8f, colW[2] - pad * 2);
            int maxLines = Math.max(1, Math.max(valueLines.size(), noteLines.size()));
            float rowH = Math.max(minH, pad * 2 + maxLines * lineH);

            ensureSpace(rowH + 2);

            // alternating fill – treat as an even row (white)
            // outer bottom rule
            stroke(C_RULE);
            cs.setLineWidth(0.3f);
            cs.moveTo(MARGIN, y - rowH);
            cs.lineTo(MARGIN + colW[0] + colW[1] + colW[2], y - rowH);
            cs.stroke();

            // col 0 – param name (single line, vertically centered)
            float textBaseY = y - pad - lineH + 3;
            text(param, fRegular, 8f, C_TEXT, MARGIN + pad, textBaseY);

            // col 1 – value (wrapped)
            float cx1 = MARGIN + colW[0];
            float ty1 = y - pad - lineH + 3;
            for (String l : valueLines) {
                text(l, fMono, 7.5f, C_TEXT, cx1 + pad, ty1);
                ty1 -= lineH;
            }

            // col 2 – note (wrapped)
            float cx2 = MARGIN + colW[0] + colW[1];
            float ty2 = y - pad - lineH + 3;
            for (String l : noteLines) {
                text(l, fRegular, 8f, C_TEXT, cx2 + pad, ty2);
                ty2 -= lineH;
            }

            y -= rowH;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Formula block (text)
        //  Design: white bg, 2px accent left bar, thin outer border
        // ───────────────────────────────────────────────────────────────────────
        private void formulaBlock(String title, String[] formulaLines, String explanation) throws Exception {
            float lineH  = 13f;
            float pad    = 8f;
            int   expLns = countLines(explanation, CW - 26, 8.5f, fRegular);
            float blockH = pad + lineH + formulaLines.length * lineH + expLns * 12f + pad;

            ensureSpace(blockH + 8);
            float top = y;

            // border + left accent
            strokeRect(MARGIN, top - blockH, CW, blockH, C_RULE, 0.5f);
            fillRect(MARGIN, top - blockH, 2.5f, blockH, C_ACCENT);

            float tx = MARGIN + 12;
            float ty = top - pad - lineH + 3;

            text(title, fBold, 9.5f, C_TEXT, tx, ty);
            ty -= lineH + 1;

            for (String line : formulaLines) {
                text(line, fMono, 7.5f, C_ACCENT, tx, ty);
                ty -= lineH;
            }
            ty -= 3;
            wrappedText(explanation, fRegular, 8.5f, C_TEXT_MUTED, tx, ty, CW - 26, 12f);
            y = top - blockH - 6;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Formula block (LaTeX rendered)
        // ───────────────────────────────────────────────────────────────────────
        private void formulaBlockLatex(String title, String[] latexLines, String explanation) throws Exception {
            float lineH = 13f;
            float pad   = 8f;
            int expLns  = countLines(explanation, CW - 26, 8.5f, fRegular);
            float latexTotalH = 0f;
            for (String latex : latexLines) {
                latexTotalH += estimateLatexFormulaHeight(latex, CW - 26) + 6f;
            }
            float blockH = pad + lineH + latexTotalH + expLns * 12f + pad;

            ensureSpace(blockH + 8);
            float top = y;

            strokeRect(MARGIN, top - blockH, CW, blockH, C_RULE, 0.5f);
            fillRect(MARGIN, top - blockH, 2.5f, blockH, C_ACCENT);

            float tx = MARGIN + 12;
            float ty = top - pad - lineH + 3;

            text(title, fBold, 9.5f, C_TEXT, tx, ty);
            ty -= lineH + 1;

            for (String latex : latexLines) {
                float usedH = drawLatexFormula(latex, tx, ty + 2, CW - 26);
                ty -= usedH + 6;
            }

            wrappedText(explanation, fRegular, 8.5f, C_TEXT_MUTED, tx, ty, CW - 26, 12f);
            y = top - blockH - 6;
        }

        private float drawLatexFormula(String latex, float x, float topY, float maxW) throws Exception {
            try {
                TeXFormula formula = new TeXFormula(latex);
                TeXIcon icon = formula.createTeXIcon(TeXConstants.STYLE_DISPLAY, 15f);

                int srcW = Math.max(1, icon.getIconWidth());
                int srcH = Math.max(1, icon.getIconHeight());
                float fitScale  = srcW > maxW ? (maxW / srcW) : 1f;
                int   targetW   = Math.max(1, Math.round(srcW * fitScale));
                int   targetH   = Math.max(1, Math.round(srcH * fitScale));

                int ss      = 3;
                int renderW = Math.max(1, targetW * ss);
                int renderH = Math.max(1, targetH * ss);
                BufferedImage img = new BufferedImage(renderW, renderH, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g2 = img.createGraphics();
                g2.setColor(new Color(0, 0, 0, 0));
                g2.fillRect(0, 0, renderW, renderH);
                g2.setColor(C_TEXT);
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,     RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION,     RenderingHints.VALUE_INTERPOLATION_BICUBIC);
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

        // ───────────────────────────────────────────────────────────────────────
        //  Primitives
        // ───────────────────────────────────────────────────────────────────────

        private void newPage() throws Exception {
            if (cs != null) cs.close();
            page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            cs = new PDPageContentStream(doc, page);
            // pure white background
            cs.setNonStrokingColor(C_WHITE);
            cs.addRect(0, 0, PW, PH);
            cs.fill();
            y = PH - MARGIN;
        }

        private void ensureSpace(float need) throws Exception {
            if (y - need < MARGIN + 20) newPage();
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

        /** Stroke-only rectangle (no fill). */
        private void strokeRect(float x, float rectY, float w, float h, Color c, float lineW) throws Exception {
            stroke(c);
            cs.setLineWidth(lineW);
            cs.addRect(x, rectY, w, h);
            cs.stroke();
        }

        /** Full-width horizontal rule at current y. */
        private void hRule(Color c, float lineW) throws Exception {
            stroke(c);
            cs.setLineWidth(lineW);
            cs.moveTo(MARGIN, y);
            cs.lineTo(MARGIN + CW, y);
            cs.stroke();
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
            if (cur.length() > 0) res.add(cur.toString());
            return res.isEmpty() ? Collections.singletonList("") : res;
        }

        private int countLines(String text, float maxW, float size, PDFont font) {
            int total = 0;
            for (String para : text.split("\\n")) {
                try   { total += wrapLine(para, font, size, maxW).size(); }
                catch (Exception e) { total += 1; }
            }
            return Math.max(total, 1);
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Font loading
        // ───────────────────────────────────────────────────────────────────────
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
                    } catch (Exception ignored) {}
                }
            }
            return bold
                    ? new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)
                    : new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        }

        // ───────────────────────────────────────────────────────────────────────
        //  Utilities
        // ───────────────────────────────────────────────────────────────────────
        private static String ascii(String s) { return s == null ? "" : s; }
        private static String fmt(double v)   { return String.format("%.2f", v); }

        private static String fmtVal(Map<String, Object> m, String key) {
            Object v = m.get(key);
            return v == null ? "-" : String.format("%.2f", ((Number) v).doubleValue());
        }

        private static String pct(Map<String, Object> m, String key) {
            Object v = m.get(key);
            return v == null ? "-" : String.format("%.2f%%", ((Number) v).doubleValue() * 100);
        }

        private static double[] toDoubleArr(Object o) {
            if (o instanceof double[] arr) return arr;
            if (o instanceof List<?> l) {
                double[] a = new double[l.size()];
                for (int i = 0; i < l.size(); i++) a[i] = ((Number) l.get(i)).doubleValue();
                return a;
            }
            return new double[0];
        }

        private static String[] toStringArr(Object o) {
            if (o instanceof String[] arr) return arr;
            if (o instanceof List<?> l) return l.stream().map(Object::toString).toArray(String[]::new);
            return new String[0];
        }
    }
}