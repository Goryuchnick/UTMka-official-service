/* pixel-icons.js v6 — собственный движок пиксель-графики.
   Иконки строятся из геометрических примитивов (круг по Брезенхэму, линия,
   прямоугольник, заливка) на сетке 16×16. Это гарантирует симметрию и ровность.
*/
(function () {
  'use strict';

  // ── ПАЛИТРЫ ─────────────────────────────────────────────────────
  var P = {
    // amber
    a1: '#FFB000', a2: '#5A3408', a3: '#FFD24A',
    // red
    r1: '#C64545', r2: '#5A1818', r3: '#E88080',
    // teal
    t1: '#2A8F85', t2: '#0F3F3A', t3: '#6AEDDA',
    // green
    g1: '#3FA23F', g2: '#1A4A1A', g3: '#7FE07F',
    // magenta
    m1: '#C0406A', m2: '#5A1A3A', m3: '#E87AA5',
    // gray/steel
    s1: '#A0A0A0', s2: '#2A2A2A', s3: '#DCDCDC',
    // white/dark
    wh: '#F6F0E0', bk: '#1A1408',
  };

  // ── CANVAS ──────────────────────────────────────────────────────
  var N = 16;

  function Canvas() {
    this.g = [];
    for (var y = 0; y < N; y++) {
      var row = [];
      for (var x = 0; x < N; x++) row.push(null);
      this.g.push(row);
    }
  }
  Canvas.prototype.set = function (x, y, c) {
    if (x < 0 || x >= N || y < 0 || y >= N) return;
    this.g[y][x] = c;
  };
  Canvas.prototype.get = function (x, y) {
    if (x < 0 || x >= N || y < 0 || y >= N) return null;
    return this.g[y][x];
  };
  // Круг-контур (Брезенхэм)
  Canvas.prototype.circleOut = function (cx, cy, r, c) {
    var x = 0, y = r, d = 3 - 2 * r, self = this;
    function plot(dx, dy) {
      self.set(cx + dx, cy + dy, c);
      self.set(cx - dx, cy + dy, c);
      self.set(cx + dx, cy - dy, c);
      self.set(cx - dx, cy - dy, c);
      self.set(cx + dy, cy + dx, c);
      self.set(cx - dy, cy + dx, c);
      self.set(cx + dy, cy - dx, c);
      self.set(cx - dy, cy - dx, c);
    }
    while (y >= x) {
      plot(x, y);
      x++;
      if (d > 0) { y--; d = d + 4 * (x - y) + 10; }
      else d = d + 4 * x + 6;
    }
  };
  // Заполненный круг (через квадрат расстояний)
  Canvas.prototype.circleFill = function (cx, cy, r, c) {
    var r2 = (r + 0.3) * (r + 0.3);
    for (var y = -r; y <= r; y++)
      for (var x = -r; x <= r; x++)
        if (x * x + y * y <= r2) this.set(cx + x, cy + y, c);
  };
  // Диск = fill + outline
  Canvas.prototype.disc = function (cx, cy, r, fill, outline) {
    this.circleFill(cx, cy, r, fill);
    this.circleOut(cx, cy, r, outline);
  };
  // Линия (Брезенхэм)
  Canvas.prototype.line = function (x0, y0, x1, y1, c) {
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    while (true) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  };
  // Толстая линия (2px)
  Canvas.prototype.line2 = function (x0, y0, x1, y1, c) {
    this.line(x0, y0, x1, y1, c);
    if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) {
      this.line(x0, y0 + 1, x1, y1 + 1, c);
    } else {
      this.line(x0 + 1, y0, x1 + 1, y1, c);
    }
  };
  // Прямоугольник
  Canvas.prototype.rectFill = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++)
      for (var i = 0; i < w; i++)
        this.set(x + i, y + j, c);
  };
  Canvas.prototype.rectOut = function (x, y, w, h, c) {
    for (var i = 0; i < w; i++) { this.set(x + i, y, c); this.set(x + i, y + h - 1, c); }
    for (var j = 0; j < h; j++) { this.set(x, y + j, c); this.set(x + w - 1, y + j, c); }
  };
  Canvas.prototype.box = function (x, y, w, h, fill, outline) {
    this.rectFill(x, y, w, h, fill);
    if (outline !== undefined) this.rectOut(x, y, w, h, outline);
  };

  // ── ИКОНКИ ──────────────────────────────────────────────────────
  var ICONS = {};

  // COPY — два листа, передний перекрывает задний
  ICONS.copy = function (c) {
    c.box(2, 1, 9, 10, P.a1, P.a2);
    c.set(3, 2, P.a3); c.set(4, 2, P.a3);
    c.box(5, 5, 9, 10, P.a1, P.a2);
    c.set(6, 6, P.a3); c.set(7, 6, P.a3);
  };

  // TRASH — крышка + корпус + полосы внутри
  ICONS.trash = function (c) {
    // ручка
    c.rectFill(6, 1, 4, 2, P.r2);
    // крышка
    c.rectFill(2, 3, 12, 2, P.r1); c.rectOut(2, 3, 12, 2, P.r2);
    // корпус
    c.box(3, 5, 10, 10, P.r1, P.r2);
    // полосы
    c.line(6, 7, 6, 13, P.r2);
    c.line(9, 7, 9, 13, P.r2);
  };
  ICONS['trash-2'] = ICONS.trash;

  // PLUS — симметричный крест
  ICONS.plus = function (c) {
    c.rectFill(2, 7, 12, 2, P.a1);
    c.rectFill(7, 2, 2, 12, P.a1);
    // outline
    c.rectOut(2, 7, 12, 2, P.a2);
    c.rectOut(7, 2, 2, 12, P.a2);
    // убираем пересечение контуров внутри креста
    c.set(7, 7, P.a1); c.set(8, 7, P.a1);
    c.set(7, 8, P.a1); c.set(8, 8, P.a1);
  };

  // PLUS-CIRCLE — плюс в круге
  ICONS['plus-circle'] = function (c) {
    c.disc(7, 7, 7, P.a1, P.a2);
    c.rectFill(3, 6, 9, 3, P.a2);
    c.rectFill(6, 3, 3, 9, P.a2);
    // inner +
    c.rectFill(4, 7, 7, 1, P.a3);
    c.rectFill(7, 4, 1, 7, P.a3);
  };

  // SEARCH — круг + ручка по диагонали
  ICONS.search = function (c) {
    c.disc(6, 6, 5, P.t3, P.t2);
    c.disc(6, 6, 3, P.t1, P.t2);
    // ручка (толстая диагональ)
    c.line(11, 11, 14, 14, P.t2);
    c.line(10, 11, 13, 14, P.t2);
    c.line(11, 10, 14, 13, P.t2);
  };

  // EYE — овал + зрачок
  ICONS.eye = function (c) {
    // верхняя и нижняя дуги
    c.line(4, 6, 11, 6, P.t2);
    c.line(3, 7, 12, 7, P.t2);
    c.line(3, 8, 12, 8, P.t2);
    c.line(4, 9, 11, 9, P.t2);
    c.line(5, 5, 10, 5, P.t2);
    c.line(5, 10, 10, 10, P.t2);
    // fill внутри
    c.rectFill(4, 7, 8, 2, P.wh);
    c.rectFill(5, 6, 6, 4, P.wh);
    // зрачок
    c.disc(7, 7, 2, P.t1, P.t2);
    c.set(6, 6, P.t3);
  };

  // SUN — круг + 8 лучей
  ICONS.sun = function (c) {
    c.disc(7, 7, 3, P.a1, P.a2);
    c.set(6, 6, P.a3);
    // 4 прямых луча
    c.rectFill(6, 0, 2, 2, P.a2);
    c.rectFill(6, 13, 2, 2, P.a2);
    c.rectFill(0, 6, 2, 2, P.a2);
    c.rectFill(13, 6, 2, 2, P.a2);
    // 4 диагональных луча
    c.set(2, 2, P.a2); c.set(3, 3, P.a2);
    c.set(12, 2, P.a2); c.set(11, 3, P.a2);
    c.set(2, 12, P.a2); c.set(3, 11, P.a2);
    c.set(12, 12, P.a2); c.set(11, 11, P.a2);
  };

  // MOON — круг минус смещённый круг = полумесяц
  ICONS.moon = function (c) {
    c.disc(7, 7, 6, P.a1, P.a2);
    // вырезаем смещённый круг
    c.circleFill(9, 5, 6, null);
    // контур среза
    c.circleOut(9, 5, 6, P.a2);
    // лишние контуры снаружи удаляем (те что за пределами основного круга)
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var dx = x - 7, dy = y - 7;
        if (dx * dx + dy * dy > 42) c.set(x, y, null);
      }
    }
    // highlight
    c.set(4, 5, P.a3);
  };

  // QR-CODE — 3 угловых маркера + рандомные пиксели
  ICONS['qr-code'] = function (c) {
    function finder(x, y) {
      c.rectOut(x, y, 5, 5, P.bk);
      c.rectFill(x + 1, y + 1, 3, 3, P.wh);
      c.rectFill(x + 2, y + 2, 1, 1, P.bk);
    }
    finder(1, 1);
    finder(10, 1);
    finder(1, 10);
    // внутренний паттерн (стабильный)
    var p = [[7,1],[8,2],[7,3],[9,3],[1,7],[3,7],[5,7],[7,7],[9,8],[2,8],[4,9],[6,9],[7,10],[9,10],[8,11],[10,12],[12,12],[11,13]];
    for (var i = 0; i < p.length; i++) c.set(p[i][0], p[i][1], P.bk);
  };

  // SHRINK — 4 стрелки внутрь (уголки)
  ICONS.shrink = function (c) {
    // top-left corner arrow
    c.rectFill(1, 1, 5, 1, P.t2);
    c.rectFill(1, 1, 1, 5, P.t2);
    c.line(1, 1, 4, 4, P.t1);
    c.set(2, 2, P.t3);
    // top-right
    c.rectFill(10, 1, 5, 1, P.t2);
    c.rectFill(14, 1, 1, 5, P.t2);
    c.line(14, 1, 11, 4, P.t1);
    c.set(13, 2, P.t3);
    // bottom-left
    c.rectFill(1, 14, 5, 1, P.t2);
    c.rectFill(1, 10, 1, 5, P.t2);
    c.line(1, 14, 4, 11, P.t1);
    c.set(2, 13, P.t3);
    // bottom-right
    c.rectFill(10, 14, 5, 1, P.t2);
    c.rectFill(14, 10, 1, 5, P.t2);
    c.line(14, 14, 11, 11, P.t1);
    c.set(13, 13, P.t3);
  };

  // UPLOAD — стрелка вверх + полка
  ICONS.upload = function (c) {
    // полка внизу
    c.rectFill(2, 13, 12, 2, P.t2);
    // стрелка вверх — треугольник
    c.line(7, 1, 2, 6, P.t2); c.line(8, 1, 13, 6, P.t2);
    c.line(7, 2, 3, 6, P.t1); c.line(8, 2, 12, 6, P.t1);
    c.rectFill(4, 6, 8, 1, P.t2);
    // столбик
    c.rectFill(6, 1, 3, 12, P.t1);
    c.rectOut(6, 1, 3, 12, P.t2);
    c.set(7, 2, P.t3);
  };
  ICONS['upload-cloud'] = ICONS.upload;

  // DOWNLOAD — стрелка вниз + полка
  ICONS.download = function (c) {
    // полка внизу
    c.rectFill(2, 13, 12, 2, P.a2);
    // столбик
    c.rectFill(6, 1, 3, 10, P.a1);
    c.rectOut(6, 1, 3, 10, P.a2);
    c.set(7, 2, P.a3);
    // наконечник
    c.line(2, 8, 7, 13, P.a2); c.line(13, 8, 8, 13, P.a2);
    c.line(3, 8, 7, 12, P.a1); c.line(12, 8, 8, 12, P.a1);
    c.rectFill(4, 8, 8, 1, P.a1);
  };

  // SEND — бумажный самолётик
  ICONS.send = function (c) {
    // треугольный корпус
    c.line(1, 7, 14, 1, P.t2);
    c.line(1, 7, 14, 14, P.t2);
    c.line(14, 1, 14, 14, P.t2);
    // fill верхней половины
    for (var y = 2; y <= 7; y++) {
      for (var x = 2; x <= 13; x++) {
        // верхняя диагональ y ≈ 7 - (x-1)/13*6
        var edge = 7 - Math.round((x - 1) / 13 * 6);
        if (y >= edge && y <= 7 && x <= 13) c.set(x, y, P.t1);
      }
    }
    // линия-складка в центре
    c.line(1, 7, 7, 7, P.t2);
    c.set(8, 7, P.t2);
    // хвостик
    c.line(4, 7, 8, 10, P.t2);
    c.line(4, 7, 5, 10, P.t2);
  };

  // GLOBE — круг + меридианы
  ICONS.globe = function (c) {
    c.disc(7, 7, 7, P.t1, P.t2);
    // вертикальный меридиан
    c.line(7, 1, 7, 13, P.t2);
    // экватор
    c.line(1, 7, 13, 7, P.t2);
    // боковые меридианы (эллипсы — упрощённо)
    c.line(3, 3, 3, 11, P.t2);
    c.line(11, 3, 11, 11, P.t2);
    // highlight
    c.set(4, 4, P.t3); c.set(5, 3, P.t3);
  };

  // CALENDAR — рамка + заголовок + точки дней
  ICONS.calendar = function (c) {
    // подвески
    c.rectFill(3, 0, 2, 3, P.a2);
    c.rectFill(10, 0, 2, 3, P.a2);
    // шапка
    c.box(1, 2, 14, 3, P.a1, P.a2);
    // тело
    c.box(1, 5, 14, 10, P.wh, P.a2);
    // сетка точек
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 4; col++) {
        var px = 3 + col * 3;
        var py = 7 + row * 2;
        c.set(px, py, P.a2);
        c.set(px + 1, py, P.a2);
      }
    }
  };

  // HEART — две дуги + треугольник
  ICONS.heart = function (c) {
    // две горки сверху (диски)
    c.circleFill(4, 5, 2, P.m1);
    c.circleFill(10, 5, 2, P.m1);
    c.circleOut(4, 5, 2, P.m2);
    c.circleOut(10, 5, 2, P.m2);
    // центральная часть + треугольник вниз
    for (var y = 5; y <= 12; y++) {
      var w = 12 - (y - 5) * 2; // сужается вниз
      if (w < 1) continue;
      var x = 7 - Math.floor(w / 2);
      c.rectFill(x, y, w, 1, P.m1);
    }
    // outline
    c.line(1, 5, 1, 6, P.m2);
    c.line(2, 7, 2, 8, P.m2);
    c.line(3, 9, 3, 10, P.m2);
    c.line(4, 11, 4, 11, P.m2);
    c.set(5, 12, P.m2); c.set(6, 13, P.m2); c.set(7, 13, P.m2); c.set(8, 12, P.m2);
    c.line(9, 11, 9, 11, P.m2);
    c.line(10, 9, 10, 10, P.m2);
    c.line(11, 7, 11, 8, P.m2);
    c.line(12, 5, 12, 6, P.m2);
    // highlight
    c.set(3, 4, P.m3); c.set(9, 4, P.m3);
  };

  // SPARKLES / WAND-SPARKLES — 4-конечная звезда + маленькие
  ICONS.sparkles = function (c) {
    // большая звезда в центре
    c.rectFill(7, 2, 2, 11, P.a1);
    c.rectFill(2, 7, 11, 2, P.a1);
    // края потоньше
    c.set(7, 1, P.a2); c.set(8, 1, P.a2);
    c.set(7, 13, P.a2); c.set(8, 13, P.a2);
    c.set(1, 7, P.a2); c.set(1, 8, P.a2);
    c.set(13, 7, P.a2); c.set(13, 8, P.a2);
    // outline
    c.rectOut(7, 2, 2, 11, P.a2);
    c.rectOut(2, 7, 11, 2, P.a2);
    // highlight
    c.set(7, 7, P.a3); c.set(8, 8, P.a3);
    // маленькие звёздочки
    c.set(12, 2, P.a3); c.set(13, 1, P.a2); c.set(13, 3, P.a2);
    c.set(11, 2, P.a2);
    c.set(2, 12, P.a3); c.set(1, 11, P.a2); c.set(1, 13, P.a2);
    c.set(3, 12, P.a2);
  };
  ICONS['wand-sparkles'] = ICONS.sparkles;
  ICONS.wand = ICONS.sparkles;

  // HELP-CIRCLE — круг + знак вопроса
  ICONS['help-circle'] = function (c) {
    c.disc(7, 7, 7, P.a1, P.a2);
    // вопросик (упрощённо, не буква а форма)
    c.rectFill(5, 4, 5, 1, P.a2);
    c.rectFill(4, 5, 1, 2, P.a2);
    c.rectFill(9, 5, 1, 2, P.a2);
    c.rectFill(8, 7, 1, 1, P.a2);
    c.rectFill(7, 8, 1, 1, P.a2);
    c.rectFill(7, 9, 1, 1, P.a2);
    c.set(7, 11, P.a2);
  };
  ICONS.help = ICONS['help-circle'];

  // X / CLOSE — две диагонали
  ICONS.x = function (c) {
    for (var i = 0; i < 11; i++) {
      c.set(2 + i, 2 + i, P.r2);
      c.set(3 + i, 2 + i, P.r1);
      c.set(2 + i, 3 + i, P.r1);
      c.set(13 - i, 2 + i, P.r2);
      c.set(12 - i, 2 + i, P.r1);
      c.set(13 - i, 3 + i, P.r1);
    }
  };
  ICONS.close = ICONS.x;

  // CHECK — галочка
  ICONS.check = function (c) {
    // короткий луч вниз-вправо
    c.line(2, 7, 6, 11, P.g2);
    c.line(3, 7, 7, 11, P.g1);
    c.line(2, 8, 6, 12, P.g1);
    // длинный луч вверх-вправо
    c.line(6, 11, 13, 4, P.g2);
    c.line(7, 11, 14, 4, P.g1);
    c.line(6, 12, 13, 5, P.g1);
    // утолщение в центре
    c.set(6, 11, P.g2);
    c.set(7, 12, P.g2);
  };

  // CHECK-CIRCLE — круг + галка
  ICONS['check-circle'] = function (c) {
    c.disc(7, 7, 7, P.g1, P.g2);
    c.line(3, 7, 6, 10, P.wh);
    c.line(4, 7, 7, 10, P.wh);
    c.line(6, 10, 11, 5, P.wh);
    c.line(7, 10, 12, 5, P.wh);
  };

  // ALERT / WARN — треугольник с восклицательным
  ICONS.warn = function (c) {
    // треугольник outline
    for (var i = 0; i < 14; i++) {
      var left = 7 - Math.floor(i / 2);
      var right = 7 + Math.floor(i / 2);
      if (i === 0) { c.set(7, 1, P.a2); }
      else {
        c.set(left, 1 + i, P.a2);
        c.set(right, 1 + i, P.a2);
        for (var xx = left + 1; xx < right; xx++) c.set(xx, 1 + i, P.a1);
      }
    }
    // основание
    c.rectFill(0, 14, 16, 1, P.a2);
    // восклицательный знак
    c.rectFill(7, 5, 2, 5, P.a2);
    c.rectFill(7, 11, 2, 2, P.a2);
  };
  ICONS['alert-circle'] = ICONS.warn;
  ICONS['alert-triangle'] = ICONS.warn;

  // CLOCK — круг + две стрелки
  ICONS.clock = function (c) {
    c.disc(7, 7, 7, P.wh, P.bk);
    // метки 12/3/6/9
    c.set(7, 1, P.bk); c.set(8, 1, P.bk);
    c.set(7, 13, P.bk); c.set(8, 13, P.bk);
    c.set(1, 7, P.bk); c.set(1, 8, P.bk);
    c.set(13, 7, P.bk); c.set(13, 8, P.bk);
    // часовая (вверх)
    c.line(7, 7, 7, 4, P.a2); c.line(8, 7, 8, 4, P.a2);
    // минутная (вправо)
    c.line(7, 7, 11, 7, P.a1); c.line(7, 8, 11, 8, P.a1);
    // центр
    c.set(7, 7, P.bk); c.set(8, 7, P.bk); c.set(7, 8, P.bk); c.set(8, 8, P.bk);
  };

  // GEAR — круг с зубцами + центральное отверстие
  ICONS.gear = function (c) {
    // основа — диск
    c.disc(7, 7, 5, P.s1, P.s2);
    // 8 зубцов (квадратики по сторонам и по диагоналям)
    c.rectFill(6, 0, 3, 2, P.s1); c.rectOut(6, 0, 3, 2, P.s2);
    c.rectFill(6, 13, 3, 2, P.s1); c.rectOut(6, 13, 3, 2, P.s2);
    c.rectFill(0, 6, 2, 3, P.s1); c.rectOut(0, 6, 2, 3, P.s2);
    c.rectFill(13, 6, 2, 3, P.s1); c.rectOut(13, 6, 2, 3, P.s2);
    // диагональные зубцы
    c.rectFill(2, 2, 2, 2, P.s1); c.rectOut(2, 2, 2, 2, P.s2);
    c.rectFill(11, 2, 2, 2, P.s1); c.rectOut(11, 2, 2, 2, P.s2);
    c.rectFill(2, 11, 2, 2, P.s1); c.rectOut(2, 11, 2, 2, P.s2);
    c.rectFill(11, 11, 2, 2, P.s1); c.rectOut(11, 11, 2, 2, P.s2);
    // центральная дыра
    c.disc(7, 7, 2, P.bk, P.s2);
    // highlight
    c.set(5, 5, P.s3);
  };
  ICONS.settings = ICONS.gear;

  // LINK — две овальные звена
  ICONS.link = function (c) {
    // верхнее звено (наклонное)
    c.rectOut(1, 4, 7, 4, P.a2);
    c.rectFill(2, 5, 5, 2, P.a1);
    // нижнее звено (наклонное со сдвигом)
    c.rectOut(8, 8, 7, 4, P.a2);
    c.rectFill(9, 9, 5, 2, P.a1);
    // перемычка
    c.rectFill(7, 6, 2, 2, P.a1);
    c.rectFill(6, 7, 4, 2, P.a2);
    c.set(7, 7, P.a1); c.set(8, 7, P.a1);
    c.set(7, 8, P.a1); c.set(8, 8, P.a1);
  };

  // EXTERNAL-LINK — рамка + стрелка наружу
  ICONS['external-link'] = function (c) {
    // рамка
    c.rectOut(1, 4, 10, 11, P.a2);
    c.rectFill(2, 5, 8, 9, P.a1);
    // стрелка вверх-вправо
    c.line(6, 9, 14, 1, P.a2);
    c.line(7, 9, 14, 2, P.a3);
    c.line(6, 10, 13, 3, P.a3);
    // наконечник
    c.rectFill(10, 1, 5, 1, P.a2);
    c.rectFill(14, 1, 1, 5, P.a2);
    c.set(11, 2, P.a2);
  };

  // CHEVRON-UP / DOWN
  ICONS['chevron-up'] = function (c) {
    c.line(1, 10, 7, 4, P.a2); c.line(1, 11, 7, 5, P.a1);
    c.line(14, 10, 8, 4, P.a2); c.line(14, 11, 8, 5, P.a1);
    c.line(2, 10, 7, 5, P.a1); c.line(13, 10, 8, 5, P.a1);
  };
  ICONS['chevron-down'] = function (c) {
    c.line(1, 5, 7, 11, P.a2); c.line(1, 4, 7, 10, P.a1);
    c.line(14, 5, 8, 11, P.a2); c.line(14, 4, 8, 10, P.a1);
    c.line(2, 5, 7, 10, P.a1); c.line(13, 5, 8, 10, P.a1);
  };

  // ARROW-RIGHT — стрелка →
  ICONS['arrow-right'] = function (c) {
    c.rectFill(1, 6, 11, 3, P.a1);
    c.rectOut(1, 6, 11, 3, P.a2);
    // наконечник
    c.line(8, 3, 14, 7, P.a2); c.line(8, 11, 14, 7, P.a2);
    c.line(9, 4, 13, 7, P.a1); c.line(9, 10, 13, 7, P.a1);
    c.set(14, 7, P.a2); c.set(14, 8, P.a2);
    c.set(13, 7, P.a1); c.set(13, 8, P.a1);
  };
  ICONS.arrow = ICONS['arrow-right'];

  // BOLT / ZAP — молния
  ICONS.bolt = function (c) {
    // верхняя диагональ
    var p = [
      [9,1],[10,1],
      [7,2],[8,2],[9,2],[10,2],
      [6,3],[7,3],[8,3],[9,3],
      [5,4],[6,4],[7,4],[8,4],
      [4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],
      [5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],
      [6,7],[7,7],[8,7],[9,7],[10,7],
      [5,8],[6,8],[7,8],[8,8],[9,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],
      [5,10],[6,10],[7,10],
      [5,11],[6,11],
      [5,12],
    ];
    for (var i = 0; i < p.length; i++) c.set(p[i][0], p[i][1], P.a1);
    // контур вокруг светлого тела (тёмный контур)
    // Пройдёмся по всем пикселям P.a1 и поставим P.a2 вокруг, если пусто
    for (var yy = 0; yy < N; yy++) {
      for (var xx = 0; xx < N; xx++) {
        if (c.get(xx, yy) === P.a1) {
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) {
            if (c.get(xx + d[0], yy + d[1]) === null) c.set(xx + d[0], yy + d[1], P.a2);
          });
        }
      }
    }
    // highlight в центре
    c.set(7, 5, P.a3); c.set(8, 5, P.a3);
  };
  ICONS.zap = ICONS.bolt;

  // FLAG
  ICONS.flag = function (c) {
    // шест
    c.rectFill(2, 1, 2, 14, P.s2);
    // полотнище
    c.box(4, 2, 10, 6, P.r1, P.r2);
    // узор
    c.set(6, 4, P.r3); c.set(10, 4, P.r3);
    c.set(8, 6, P.r3);
  };

  // BOOK
  ICONS.book = function (c) {
    // обложка
    c.box(1, 2, 14, 12, P.a1, P.a2);
    // корешок
    c.rectFill(7, 2, 1, 12, P.a2);
    c.rectFill(8, 2, 1, 12, P.a2);
    // линии страниц
    c.line(3, 5, 6, 5, P.a2);
    c.line(3, 7, 6, 7, P.a2);
    c.line(3, 9, 6, 9, P.a2);
    c.line(9, 5, 12, 5, P.a2);
    c.line(9, 7, 12, 7, P.a2);
    c.line(9, 9, 12, 9, P.a2);
    // highlight
    c.set(2, 3, P.a3);
  };

  // LIST
  ICONS.list = function (c) {
    // маркеры
    c.rectFill(1, 3, 2, 2, P.a2);
    c.rectFill(1, 7, 2, 2, P.a2);
    c.rectFill(1, 11, 2, 2, P.a2);
    // линии
    c.rectFill(4, 3, 10, 2, P.a1); c.rectOut(4, 3, 10, 2, P.a2);
    c.rectFill(4, 7, 10, 2, P.a1); c.rectOut(4, 7, 10, 2, P.a2);
    c.rectFill(4, 11, 10, 2, P.a1); c.rectOut(4, 11, 10, 2, P.a2);
  };

  // LAYOUT-GRID
  ICONS['layout-grid'] = function (c) {
    c.box(1, 1, 6, 6, P.a1, P.a2);
    c.box(9, 1, 6, 6, P.a1, P.a2);
    c.box(1, 9, 6, 6, P.a1, P.a2);
    c.box(9, 9, 6, 6, P.a1, P.a2);
    // highlight
    c.set(2, 2, P.a3); c.set(10, 2, P.a3);
    c.set(2, 10, P.a3); c.set(10, 10, P.a3);
  };
  ICONS.grid = ICONS['layout-grid'];

  // TABLE
  ICONS.table = function (c) {
    c.box(0, 1, 16, 13, P.wh, P.a2);
    // горизонтали
    c.rectFill(0, 4, 16, 1, P.a2);
    c.rectFill(0, 8, 16, 1, P.a2);
    c.rectFill(0, 11, 16, 1, P.a2);
    // вертикали
    c.rectFill(5, 1, 1, 13, P.a2);
    c.rectFill(10, 1, 1, 13, P.a2);
    // шапка
    c.rectFill(1, 2, 14, 2, P.a1);
  };

  // IMAGE
  ICONS.image = function (c) {
    c.box(1, 2, 14, 12, P.wh, P.a2);
    // горы
    for (var i = 0; i < 7; i++) {
      c.line(3 + i, 11 - i, 3 + i, 13, P.g1);
    }
    for (var j = 0; j < 5; j++) {
      c.line(8 + j, 9 + j, 8 + j, 13, P.t1);
    }
    // солнце
    c.disc(11, 5, 2, P.a1, P.a2);
  };

  // FILE-CODE / FILE-*
  ICONS['file-code'] = function (c) {
    c.box(2, 1, 10, 14, P.wh, P.a2);
    // уголок
    c.rectFill(9, 1, 3, 3, P.a1);
    c.rectOut(9, 1, 3, 3, P.a2);
    // < >
    c.set(5, 7, P.a2); c.set(4, 8, P.a2); c.set(5, 9, P.a2);
    c.set(8, 7, P.a2); c.set(9, 8, P.a2); c.set(8, 9, P.a2);
    // линии текста
    c.rectFill(4, 11, 6, 1, P.a2);
  };
  ICONS['file-json'] = ICONS['file-code'];
  ICONS['file-spreadsheet'] = ICONS['file-code'];
  ICONS.file = ICONS['file-code'];

  // GITHUB — стилизованный силуэт кошки/кота
  ICONS.github = function (c) {
    c.disc(7, 8, 6, P.bk, P.s2);
    // глаза
    c.set(5, 7, P.wh); c.set(6, 7, P.wh);
    c.set(9, 7, P.wh); c.set(10, 7, P.wh);
    c.set(5, 8, P.s3); c.set(10, 8, P.s3);
    // лапки
    c.rectFill(4, 13, 2, 2, P.bk);
    c.rectFill(9, 13, 2, 2, P.bk);
  };

  // CHAT / MESSAGE
  ICONS.chat = function (c) {
    c.box(1, 2, 13, 10, P.a1, P.a2);
    // хвостик
    c.set(3, 12, P.a2); c.set(4, 12, P.a2); c.set(5, 12, P.a2);
    c.set(4, 13, P.a2);
    c.set(4, 12, P.a1);
    // точки
    c.rectFill(4, 6, 2, 2, P.a3);
    c.rectFill(7, 6, 2, 2, P.a3);
    c.rectFill(10, 6, 2, 2, P.a3);
  };
  ICONS.message = ICONS.chat;
  ICONS['message-circle'] = ICONS.chat;

  // QUOTE
  ICONS.quote = function (c) {
    // левая кавычка
    c.box(1, 2, 5, 5, P.m1, P.m2);
    c.rectFill(3, 6, 3, 4, P.m1);
    c.line(3, 8, 3, 9, P.m2);
    c.line(5, 8, 5, 9, P.m2);
    c.set(3, 10, P.m2); c.set(4, 10, P.m2); c.set(5, 10, P.m2);
    // правая кавычка
    c.box(9, 2, 5, 5, P.m1, P.m2);
    c.rectFill(11, 6, 3, 4, P.m1);
    c.line(11, 8, 11, 9, P.m2);
    c.line(13, 8, 13, 9, P.m2);
    c.set(11, 10, P.m2); c.set(12, 10, P.m2); c.set(13, 10, P.m2);
  };

  // TARGET — мишень
  ICONS.target = function (c) {
    c.disc(7, 7, 7, P.wh, P.bk);
    c.disc(7, 7, 5, P.r1, P.r2);
    c.disc(7, 7, 3, P.wh, P.bk);
    c.disc(7, 7, 1, P.r1, P.r2);
  };

  // BRAIN — упрощённо (два полушария в виде облачков)
  ICONS.brain = function (c) {
    // левое
    c.disc(4, 5, 2, P.m1, P.m2);
    c.disc(3, 8, 2, P.m1, P.m2);
    c.disc(5, 11, 2, P.m1, P.m2);
    // правое
    c.disc(11, 5, 2, P.m1, P.m2);
    c.disc(12, 8, 2, P.m1, P.m2);
    c.disc(10, 11, 2, P.m1, P.m2);
    // середина
    c.rectFill(5, 5, 6, 7, P.m1);
    c.rectFill(7, 3, 2, 11, P.m2);
    // highlight точки
    c.set(4, 4, P.m3); c.set(11, 4, P.m3);
  };

  // BULB — лампочка
  ICONS.bulb = function (c) {
    c.disc(7, 6, 5, P.a1, P.a2);
    // цоколь
    c.rectFill(5, 11, 6, 2, P.s1); c.rectOut(5, 11, 6, 2, P.s2);
    c.rectFill(6, 13, 4, 1, P.s2);
    c.set(7, 14, P.s2); c.set(8, 14, P.s2);
    // блик
    c.set(5, 4, P.a3);
  };

  // WRENCH — ключ
  ICONS.wrench = function (c) {
    // головка
    c.rectOut(1, 1, 6, 6, P.s2);
    c.rectFill(2, 2, 4, 4, P.s1);
    c.clearRect(3, 0, 2, 3);
    // рукоять по диагонали
    for (var i = 0; i < 9; i++) {
      c.set(6 + i, 6 + i, P.s2);
      c.set(7 + i, 6 + i, P.s1);
      c.set(6 + i, 7 + i, P.s1);
      c.set(7 + i, 7 + i, P.s2);
    }
  };

  // Дополнительно: clearRect helper
  Canvas.prototype.clearRect = function (x, y, w, h) {
    for (var j = 0; j < h; j++)
      for (var i = 0; i < w; i++)
        this.set(x + i, y + j, null);
  };

  // MENU / FILTER / SAVE / INFO — простые
  ICONS.menu = function (c) {
    c.rectFill(2, 3, 12, 2, P.a2);
    c.rectFill(2, 7, 12, 2, P.a2);
    c.rectFill(2, 11, 12, 2, P.a2);
  };
  ICONS.filter = function (c) {
    // воронка
    c.line(1, 2, 14, 2, P.a2);
    c.line(1, 3, 14, 3, P.a1);
    c.line(3, 4, 12, 4, P.a1);
    c.line(4, 5, 11, 5, P.a1);
    c.line(5, 6, 10, 6, P.a1);
    c.line(6, 7, 9, 7, P.a1);
    c.rectFill(6, 8, 3, 6, P.a1);
    c.rectOut(6, 8, 3, 6, P.a2);
  };
  ICONS.info = function (c) {
    c.disc(7, 7, 7, P.t1, P.t2);
    c.rectFill(7, 4, 2, 2, P.wh);
    c.rectFill(7, 7, 2, 5, P.wh);
  };
  ICONS['refresh-cw'] = function (c) {
    // круг-дуга
    c.circleOut(7, 7, 5, P.a2);
    c.circleOut(7, 7, 4, P.a1);
    // стираем кусочек сверху-справа
    for (var xx = 9; xx <= 14; xx++) for (var yy = 0; yy <= 5; yy++) c.set(xx, yy, null);
    // стрелочка
    c.set(9, 1, P.a2); c.set(10, 2, P.a2); c.set(9, 3, P.a2);
    c.set(9, 4, P.a2); c.set(8, 5, P.a2);
  };
  ICONS.refresh = ICONS['refresh-cw'];

  // IMPORT (upload alias)
  ICONS.import = ICONS.upload;

  // ERASER
  ICONS.eraser = function (c) {
    // наклонный прямоугольник
    for (var i = 0; i < 10; i++) {
      c.rectFill(4 - Math.floor(i / 2), 2 + i, 8, 1, P.m1);
      c.set(4 - Math.floor(i / 2), 2 + i, P.m2);
      c.set(11 - Math.floor(i / 2), 2 + i, P.m2);
    }
    c.set(4, 2, P.m2); c.set(5, 2, P.m2); c.set(10, 2, P.m2); c.set(11, 2, P.m2);
    c.set(0, 11, P.m2); c.set(1, 11, P.m2); c.set(6, 11, P.m2); c.set(7, 11, P.m2);
  };
  ICONS.edit = ICONS.eraser;
  ICONS.pen = ICONS.eraser;

  // ── АЛИАСЫ lucide → stroke-иконки PixelIcon (pronin-alex /course) ──
  // Stroke-глифы подгружаются отдельным файлом `stroke-glyphs.js` →
  // window.STROKE_GLYPHS. Раскраска зашивается по семантике (см. COLOR_MAP).
  // Если stroke-глиф найден — он используется приоритетно над UTMka pixel-art.
  var STROKE_ALIASES = {
    zap: 'bolt',
    x: 'close',
    'circle-x': 'close',
    'alert-triangle': 'warn',
    'alert-octagon': 'warn',
    'alert-circle': 'warn',
    'circle-help': 'info',
    'circle-question': 'info',
    'help-circle': 'info',
    help: 'info',
    settings: 'gear',
    cog: 'gear',
    'circle-check': 'check-circle',
    'message-circle': 'chat',
    'message-square': 'chat',
    crosshair: 'target',
    'arrow-up-right': 'external',
    'corner-up-left': 'reply',
    'corner-down-left': 'reply',
    'reply-all': 'reply',
    sparkles: 'sparkle',
    'wand-sparkles': 'sparkle',
    wand: 'sparkle',
    lightbulb: 'bulb',
    'book-open': 'book',
    timer: 'clock',
    history: 'clock',
    eraser: 'trash',
    'trash-2': 'trash',
    'plus-circle': 'add',
    plus: 'add',
    minus: 'close',
    shrink: 'compress',
    expand: 'expand',
    'qr-code': 'pacman',
    'file-json': 'document',
    'file-spreadsheet': 'document',
    'file-code': 'document',
    file: 'document',
    'layout-grid': 'list',
    grid: 'list',
    table: 'table',
    'upload-cloud': 'upload',
    moon: 'eye',
    sun: 'sparkle',
    'paper-plane': 'send',
    mail: 'mail',
    at: 'at',
  };

  // Семантическая палитра — каждая иконка рисуется в одном из этих цветов
  // (заменяет `currentColor` в исходном SVG-фрагменте).
  var COLORS = {
    amber: '#FFB000',
    teal: '#2A8F85',
    green: '#3FA23F',
    red: '#C64545',
    magenta: '#C0406A',
    blue: '#3D6FE8',
    gray: '#A89F8A',
    ink: '#3A3530',
  };

  var COLOR_MAP = {
    // amber — основные действия
    bolt: COLORS.amber, link: COLORS.amber, copy: COLORS.amber,
    edit: COLORS.amber, save: COLORS.amber, share: COLORS.amber,
    pin: COLORS.amber, prompt: COLORS.amber, terminal: COLORS.amber,
    code: COLORS.amber,
    // teal — навигация/поиск/внешнее
    search: COLORS.teal, external: COLORS.teal, globe: COLORS.teal,
    eye: COLORS.teal, 'eye-off': COLORS.teal, filter: COLORS.teal,
    compress: COLORS.teal, expand: COLORS.teal, send: COLORS.teal,
    // green — успех/добавление
    check: COLORS.green, 'check-circle': COLORS.green, add: COLORS.green,
    download: COLORS.green, upload: COLORS.green,
    // red — деструктивные/предупреждения
    trash: COLORS.red, close: COLORS.red, warn: COLORS.red,
    error: COLORS.red, lock: COLORS.red, 'eye-off': COLORS.red,
    stop: COLORS.red,
    // magenta — закладки/любимое
    heart: COLORS.magenta, star: COLORS.magenta, sparkle: COLORS.magenta,
    bookmark: COLORS.magenta, bulb: COLORS.magenta, trophy: COLORS.magenta,
    flag: COLORS.magenta,
    // blue — инфо/время/коммуникации
    info: COLORS.blue, calendar: COLORS.blue, clock: COLORS.blue,
    bell: COLORS.blue, mail: COLORS.blue, at: COLORS.blue,
    chat: COLORS.blue, reply: COLORS.blue, 'thumbs-up': COLORS.blue,
    brain: COLORS.blue,
    // ink/gray — нейтральные/служебные
    menu: COLORS.gray, 'more-h': COLORS.gray, 'more-v': COLORS.gray,
    gear: COLORS.gray, refresh: COLORS.gray, list: COLORS.gray,
    table: COLORS.gray, document: COLORS.gray, folder: COLORS.gray,
    image: COLORS.gray, video: COLORS.gray, audio: COLORS.gray,
    quote: COLORS.gray, layers: COLORS.gray, contrast: COLORS.gray,
    pacman: COLORS.amber,
  };

  function resolveStrokeName(name) {
    var sg = (typeof window !== 'undefined') && window.STROKE_GLYPHS;
    if (!sg) return null;
    if (sg[name]) return name;
    var alias = STROKE_ALIASES[name];
    if (alias && sg[alias]) return alias;
    return null;
  }

  function colorForIcon(name) {
    return COLOR_MAP[name] || COLORS.amber;
  }

  function renderStrokeGlyph(name) {
    var inner = window.STROKE_GLYPHS[name];
    var color = colorForIcon(name);
    return inner.split('currentColor').join(color);
  }

  // ── РЕНДЕР В SVG ────────────────────────────────────────────────
  function renderIcon(name, extraClass, size) {
    var strokeName = resolveStrokeName(name);
    var fn = ICONS[name];
    if (!strokeName && !fn) return null;

    var inner = '';
    if (strokeName) {
      inner = renderStrokeGlyph(strokeName);
    } else {
      var c = new Canvas();
      fn(c);
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var col = c.g[y][x];
          if (!col) continue;
          inner += '<rect x="' + x + '" y="' + y + '" width="1.04" height="1.04" fill="' + col + '"/>';
        }
      }
    }

    var cls = 'pixel-icon' + (extraClass ? ' ' + extraClass : '');
    var s = size || { w: '1em', h: '1em' };
    // crisp-edges не нужен для stroke-иконок (round-каpsы и линии страдают);
    // оставляем только для pixel-art (когда нет strokeName).
    var shape = strokeName ? 'geometricPrecision' : 'crispEdges';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="' + cls +
      '" width="' + s.w + '" height="' + s.h +
      '" viewBox="0 0 ' + N + ' ' + N +
      '" shape-rendering="' + shape + '" aria-hidden="true">' + inner + '</svg>';
  }

  window.pixelIconSVG = function (name, opts) {
    return renderIcon(name, (opts || {}).className) || '';
  };

  function sizeFromEl(el) {
    var cls = (el.getAttribute && el.getAttribute('class')) || '';
    var m = cls.match(/\bw-(\d+(?:\.\d+)?)\b/);
    if (m) { var px = Math.round(parseFloat(m[1]) * 4); return { w: px + 'px', h: px + 'px' }; }
    var w = el.getAttribute && el.getAttribute('width');
    var h = el.getAttribute && el.getAttribute('height');
    if (w && w !== '24') return { w: w + 'px', h: (h || w) + 'px' };
    return null;
  }

  function replaceNode(el, name, passClass) {
    var html = renderIcon(name, passClass, sizeFromEl(el));
    if (!html) return;
    var tmp = document.createElement('span');
    tmp.innerHTML = html;
    var newSvg = tmp.firstChild;
    if (!newSvg) return;
    var style = el.getAttribute && el.getAttribute('style');
    if (style) newSvg.setAttribute('style', style);
    el.replaceWith(newSvg);
  }

  function isKnown(name) {
    return Boolean(ICONS[name]) || Boolean(resolveStrokeName(name));
  }

  function handleLucideSvg(svg) {
    var cls = svg.getAttribute('class') || '';
    var m = cls.match(/lucide-([a-z0-9-]+)/i);
    if (!m) return;
    var name = m[1];
    if (!isKnown(name)) return;
    var pass = cls.replace(/\blucide[^\s]*/g, '').trim();
    replaceNode(svg, name, pass);
  }
  function handleDataLucide(el) {
    var name = el.getAttribute('data-lucide');
    if (!isKnown(name)) return;
    replaceNode(el, name, el.getAttribute('class') || '');
  }

  window.replacePixelIcons = function (root) {
    root = root || document;
    root.querySelectorAll('svg[class*="lucide"]').forEach(handleLucideSvg);
    root.querySelectorAll('[data-lucide]').forEach(handleDataLucide);
  };
  window.renderPixelIcons = window.replacePixelIcons;

  window.patchLucideToPixel = function () {
    function tryPatch() {
      if (!window.lucide || typeof window.lucide.createIcons !== 'function') return false;
      if (window.lucide.__pxPatched) return true;
      var orig = window.lucide.createIcons.bind(window.lucide);
      window.lucide.createIcons = function () {
        try { orig(); } catch (e) {}
        try { window.replacePixelIcons(); } catch (e) {}
      };
      window.lucide.__pxPatched = true;
      try { window.replacePixelIcons(); } catch (e) {}
      return true;
    }
    if (!tryPatch()) {
      var iv = setInterval(function () { if (tryPatch()) clearInterval(iv); }, 100);
      setTimeout(function () { clearInterval(iv); }, 10000);
    }
  };

  // MutationObserver для динамически рендеримых списков
  var obs = new MutationObserver(function (muts) {
    var need = false;
    for (var i = 0; i < muts.length && !need; i++) {
      var m = muts[i];
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n.nodeType !== 1) continue;
        if (n.matches && (n.matches('svg[class*="lucide"]') || n.matches('[data-lucide]'))) { need = true; break; }
        if (n.querySelector && (n.querySelector('svg[class*="lucide"]') || n.querySelector('[data-lucide]'))) { need = true; break; }
      }
    }
    if (need) try { window.replacePixelIcons(); } catch (e) {}
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.patchLucideToPixel();
      obs.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    window.patchLucideToPixel();
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // Очищаем localStorage от старого кэша game-icons
  try { localStorage.removeItem('utmka_gameicons_v1'); } catch (e) {}
})();
