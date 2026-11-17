(() => {
    'use strict';

    // ---------- Configuration ----------
    const SURFACES = {
        clay: { label: 'Terre battue', color: '#e2662c' },
        grass: { label: 'Gazon', color: '#3fa34d' },
        hard: { label: 'Dur', color: '#3d8bfd' },
        indoor: { label: 'Dur indoor', color: '#9b5cff' }
    };
    const GOLD = '#e8c547';

    const CATEGORIES = {
        'Grand Slam': { label: 'Grand Chelem', color: GOLD, bg: 'Grand_Slams' },
        'Masters 1000': { label: 'Masters 1000', color: '#4fd1c5', bg: 'Masters1000' },
        'ATP Finals': { label: 'ATP Finals', color: SURFACES.indoor.color, bg: 'ATP_Finals' }
    };

    // Keys match the TOURNAMENT column of data/tennis/scrap_results.csv
    const TOURNAMENTS = new Map([
        ['Australian Open', { name: "Open d'Australie", category: 'Grand Slam', surface: 'hard', place: 'Melbourne · janvier', bg: 'Australian_Open' }],
        ['French Open', { name: 'Roland-Garros', category: 'Grand Slam', surface: 'clay', place: 'Paris · mai – juin', bg: 'Rolland_Garros' }],
        ['Wimbledon', { name: 'Wimbledon', category: 'Grand Slam', surface: 'grass', place: 'Londres · juin – juillet', bg: 'Wimbledon' }],
        ['US Open', { name: 'US Open', category: 'Grand Slam', surface: 'hard', place: 'New York · août – septembre', bg: 'U.S._Open' }],
        ['Indian Wells Masters', { name: 'Indian Wells', category: 'Masters 1000', surface: 'hard', place: 'Californie · mars', bg: 'Indian_Wells_Masters' }],
        ['Miami Open', { name: 'Miami', category: 'Masters 1000', surface: 'hard', place: 'Floride · mars – avril', bg: 'Miami_Open' }],
        ['Monte-Carlo Masters', { name: 'Monte-Carlo', category: 'Masters 1000', surface: 'clay', place: 'Monaco · avril', bg: 'Monte-Carlos_Masters' }],
        ['Madrid Open', { name: 'Madrid', category: 'Masters 1000', surface: 'clay', place: 'Espagne · avril – mai', bg: 'Madrid_Open' }],
        ['Italian Open', { name: 'Rome', category: 'Masters 1000', surface: 'clay', place: 'Italie · mai', bg: 'Italian_Open' }],
        ['Canadian Open', { name: 'Canada', category: 'Masters 1000', surface: 'hard', place: 'Montréal / Toronto · août', bg: 'Canadian_Open' }],
        ['Cincinnati Masters', { name: 'Cincinnati', category: 'Masters 1000', surface: 'hard', place: 'Ohio · août', bg: 'Cincinnati_Masters' }],
        ['Shanghai Masters', { name: 'Shanghai', category: 'Masters 1000', surface: 'hard', place: 'Chine · octobre', bg: 'Shangai_Masters' }],
        ['Paris Masters', { name: 'Paris', category: 'Masters 1000', surface: 'indoor', place: 'Paris · fin octobre – novembre', bg: 'Paris_Masters' }],
        ['ATP Finals', { name: 'ATP Finals', category: 'ATP Finals', surface: 'indoor', place: 'Turin · novembre', bg: 'ATP_Finals' }]
    ]);

    const BIG3 = ['Novak Djokovic', 'Rafael Nadal', 'Roger Federer'];

    const ERA_PRESETS = [
        { label: 'Toutes', range: null },
        { label: 'Amateurs', range: [null, 1967] },
        { label: 'Ère Open', range: [1968, null] },
        { label: 'Big 3', range: [2003, 2023] },
        { label: 'Nouvelle génération', range: [2020, null] }
    ];

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const mobileQuery = window.matchMedia('(max-width: 900px)');

    const photo = name => `data/images/atp/${name.replace(/ /g, '_')}.png`;
    const lastName = name => name.split(' ').slice(1).join(' ') || name;
    const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
    const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    const state = {
        rows: [],
        bounds: [0, 0],
        era: [0, 0],
        step: null,
        tracked: null,
        pinned: null
    };

    // ---------- Bubble chart: one persistent force simulation, bubbles keyed by player ----------
    function createBubbleChart(container, { onHover, onSelect }) {
        const svg = d3.select(container).append('svg');
        svg.append('defs').append('clipPath')
            .attr('id', 'bubble-clip')
            .attr('clipPathUnits', 'objectBoundingBox')
            .append('circle').attr('cx', .5).attr('cy', .5).attr('r', .5);
        const layer = svg.append('g');

        const padding = 2;
        let width = 1;
        let height = 1;
        let nodes = [];
        let lastData = [];
        let lastOptions = {};
        let bubbles = layer.selectAll('g.bubble');
        let radiusTimer = null;
        let driftTimer = null;
        const byId = new Map();

        const collide = d3.forceCollide(d => d.r + padding).iterations(2);
        const simulation = d3.forceSimulation([])
            .force('x', d3.forceX())
            .force('y', d3.forceY())
            .force('collide', collide)
            .velocityDecay(0.28)
            .alphaDecay(0.018)
            .on('tick', renderPositions)
            .stop();

        const drag = d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.25).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });

        function resize() {
            const box = container.getBoundingClientRect();
            width = Math.max(1, box.width);
            height = Math.max(1, box.height);
            svg.attr('viewBox', `0 0 ${width} ${height}`);
            // Pull harder along the short side so the cloud fills the stage
            simulation.force('x').x(width / 2).strength(0.05 * Math.min(1, height / width));
            simulation.force('y').y(height / 2).strength(0.05 * Math.min(1, width / height));
        }

        function radiusScale(data) {
            const total = d3.sum(data, d => d.weight) || 1;
            const fill = data.length > 60 ? 0.5 : 0.4;
            const k = Math.sqrt(fill * width * height / (Math.PI * total));
            const maxR = Math.min(width, height) * (data.length <= 3 ? 0.26 : 0.3);
            return w => Math.max(3, Math.min(maxR, k * Math.sqrt(w)));
        }

        function renderPositions() {
            bubbles.attr('transform', d => {
                d.x = Math.max(d.r, Math.min(width - d.r, d.x));
                d.y = Math.max(d.r, Math.min(height - d.r, d.y));
                return `translate(${d.x},${d.y})`;
            });
        }

        function renderRadii() {
            bubbles.select('.bubble__bg').attr('r', d => d.r);
            bubbles.select('.bubble__glow').attr('r', d => d.r);
            bubbles.select('.bubble__ring').attr('r', d => d.r);
            bubbles.select('image')
                .attr('x', d => -d.r)
                .attr('y', d => -d.r)
                .attr('width', d => 2 * d.r)
                .attr('height', d => 2 * d.r);
        }

        function renderLabels(labelCount) {
            const ranked = nodes.filter(d => !d.exiting && d.r >= 26).sort((a, b) => b.r - a.r);
            const shown = new Set(ranked.slice(0, labelCount).map(d => d.id));
            bubbles.select('.bubble__label').each(function (d) {
                const label = d3.select(this);
                if (!shown.has(d.id)) {
                    label.attr('opacity', 0);
                    return;
                }
                const size = Math.max(12, Math.min(20, d.r * 0.24));
                const text = label.select('text').attr('font-size', size);
                text.selectAll('tspan').remove();
                text.append('tspan').text(lastName(d.id).toUpperCase());
                text.append('tspan').attr('class', 'count').text(`  ${d.wins}`);
                const textWidth = text.node().getComputedTextLength();
                const y = d.r - size * 0.6;
                text.attr('x', 0).attr('y', y);
                label.select('rect')
                    .attr('x', -textWidth / 2 - size * 0.45)
                    .attr('y', y - size * 0.68)
                    .attr('width', textWidth + size * 0.9)
                    .attr('height', size * 1.36)
                    .attr('rx', size * 0.68);
                label.attr('opacity', 1);
            });
        }

        function animateRadii(duration, done) {
            if (radiusTimer) radiusTimer.stop();
            const finish = () => {
                nodes.forEach(d => { d.r = d.r1; });
                collide.radius(d => d.r + padding);
                renderRadii();
                done();
            };
            if (reduceMotion) {
                finish();
                return;
            }
            radiusTimer = d3.timer(elapsed => {
                const t = Math.min(1, elapsed / duration);
                const e = d3.easeCubicInOut(t);
                nodes.forEach(d => { d.r = d.r0 + (d.r1 - d.r0) * e; });
                collide.radius(d => d.r + padding);
                renderRadii();
                if (t === 1) {
                    radiusTimer.stop();
                    finish();
                }
            });
        }

        function setDrift(enabled) {
            if (driftTimer) driftTimer.stop();
            driftTimer = null;
            if (!enabled || reduceMotion) return;
            driftTimer = d3.interval(() => {
                nodes.forEach(d => {
                    d.vx += (Math.random() - 0.5) * 1.6;
                    d.vy += (Math.random() - 0.5) * 1.6;
                });
                simulation.alpha(Math.max(simulation.alpha(), 0.12)).restart();
            }, 1600);
        }

        // data: [{ id, weight, wins, ... }]
        function update(data, options = {}) {
            lastData = data;
            lastOptions = options;
            const scale = radiusScale(data);
            const ids = new Set(data.map(d => d.id));

            data.forEach(d => {
                let node = byId.get(d.id);
                if (!node) {
                    const spread = Math.min(width, height) * 0.25;
                    node = {
                        id: d.id,
                        r: 0,
                        x: width / 2 + (Math.random() - 0.5) * spread,
                        y: height / 2 + (Math.random() - 0.5) * spread
                    };
                    byId.set(d.id, node);
                }
                Object.assign(node, d, { r0: node.r, r1: scale(d.weight), exiting: false });
            });
            byId.forEach(node => {
                if (!ids.has(node.id)) Object.assign(node, { r0: node.r, r1: 0, exiting: true });
            });
            nodes = [...byId.values()];

            bubbles = layer.selectAll('g.bubble').data(nodes, d => d.id);
            bubbles.exit().remove();
            const entering = bubbles.enter().append('g')
                .attr('class', 'bubble')
                .attr('tabindex', 0)
                .attr('role', 'button')
                .on('mouseenter focus', (event, d) => onHover(d))
                .on('mouseleave blur', () => onHover(null))
                .on('click', (event, d) => onSelect(d))
                .on('keydown', (event, d) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(d);
                    }
                });
            if (!coarsePointer) entering.call(drag);
            const inner = entering.append('g').attr('class', 'bubble__inner');
            inner.append('circle').attr('class', 'bubble__glow');
            inner.append('circle').attr('class', 'bubble__bg');
            inner.append('image')
                .attr('href', d => photo(d.id))
                .attr('clip-path', 'url(#bubble-clip)')
                .attr('preserveAspectRatio', 'xMidYMid slice');
            inner.append('circle').attr('class', 'bubble__ring');
            const label = inner.append('g').attr('class', 'bubble__label').attr('opacity', 0);
            label.append('rect');
            label.append('text');

            bubbles = entering.merge(bubbles)
                .attr('aria-label', d => `${d.id}, ${plural(d.wins || 0, 'titre')}`)
                .attr('aria-hidden', d => d.exiting ? 'true' : null);
            bubbles.select('.bubble__label').attr('opacity', 0);
            bubbles.filter('.is-tracked, .is-selected').raise();

            simulation.nodes(nodes);
            setDrift(Boolean(options.drift));
            if (reduceMotion) {
                animateRadii(0, settle);
                simulation.alpha(1);
                for (let i = 0; i < 200; i++) simulation.tick();
                renderPositions();
            } else {
                simulation.alpha(0.9).restart();
                animateRadii(options.duration ?? 1100, settle);
            }

            function settle() {
                const gone = nodes.filter(d => d.exiting);
                gone.forEach(d => byId.delete(d.id));
                nodes = nodes.filter(d => !d.exiting);
                bubbles.filter(d => d.exiting).remove();
                bubbles = bubbles.filter(d => !d.exiting);
                simulation.nodes(nodes);
                renderLabels(options.labels ?? 6);
            }
        }

        function setClass(className, id) {
            layer.selectAll('g.bubble').classed(className, d => d.id === id);
            if (id) layer.selectAll('g.bubble').filter(d => d.id === id).raise();
        }

        resize();
        new ResizeObserver(() => {
            const before = `${width}x${height}`;
            resize();
            if (`${width}x${height}` !== before && lastData.length) update(lastData, { ...lastOptions, duration: 400 });
        }).observe(container);

        return {
            update,
            setTracked(id) {
                container.classList.toggle('has-tracked', Boolean(id));
                setClass('is-tracked', id);
            },
            setSelected(id) {
                setClass('is-selected', id);
            }
        };
    }

    // ---------- Data helpers ----------
    const inEra = row => row.year >= state.era[0] && row.year <= state.era[1];
    const eraIsFull = () => state.era[0] === state.bounds[0] && state.era[1] === state.bounds[1];

    function rowsForStep(step, rows) {
        switch (step.type) {
            case 'tournament': return rows.filter(r => r.tournament === step.key);
            case 'category': return rows.filter(r => r.category === step.category);
            case 'big3': return rows.filter(r => BIG3.includes(r.winner));
            default: return rows;
        }
    }

    function groupWins(rows) {
        return d3.rollups(rows, v => ({ wins: v.length, years: v.map(r => r.year).sort((a, b) => a - b) }), r => r.winner)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.wins - a.wins);
    }

    function nodesForStep(step) {
        const rows = rowsForStep(step, state.rows.filter(inEra));
        const players = groupWins(rows);
        // The hero shows every champion at the same size, drifting
        return players.map(p => ({ ...p, weight: step.type === 'hero' ? 1 : p.wins }));
    }

    // ---------- Step descriptors ----------
    function describeStep(el) {
        const type = el.dataset.step;
        const step = { el, type, key: el.dataset.tournament, category: el.dataset.category };
        if (type === 'tournament') {
            const t = TOURNAMENTS.get(step.key);
            Object.assign(step, { title: t.name, accent: SURFACES[t.surface].color, bg: t.bg, group: t.category });
        } else if (type === 'category') {
            const c = CATEGORIES[step.category];
            Object.assign(step, { title: c.label, accent: c.color, bg: c.bg, group: step.category });
        } else if (type === 'big3') {
            Object.assign(step, { title: 'Le Big 3', accent: GOLD, bg: 'ATP_Finals', group: 'ATP Finals' });
        } else if (type === 'overview') {
            Object.assign(step, { title: 'Le panthéon', accent: GOLD, bg: 'Grand_Slams', group: 'intro' });
        } else {
            Object.assign(step, { title: 'Accueil', accent: GOLD, bg: 'Rolland_Garros', group: 'intro' });
        }
        return step;
    }

    // ---------- Backdrop & accent ----------
    const backdropLayers = [...document.querySelectorAll('.backdrop__layer')];
    let currentBackdrop = null;

    function setBackdrop(name) {
        const url = `./data/images/backgrounds/${name}.jpg`;
        if (url === currentBackdrop) return;
        currentBackdrop = url;
        const img = new Image();
        img.onload = () => {
            if (currentBackdrop !== url) return;
            const next = backdropLayers.find(l => !l.classList.contains('is-active'));
            const current = backdropLayers.find(l => l.classList.contains('is-active'));
            next.style.backgroundImage = `url('${url}')`;
            next.classList.add('is-active');
            current.classList.remove('is-active');
        };
        img.src = url;
    }

    // ---------- Cards ----------
    function statHtml(value, label) {
        return `<div class="stat"><span class="stat__value">${value}</span><span class="stat__label">${label}</span></div>`;
    }

    function recordHolders(players) {
        if (!players.length) return null;
        const best = players[0].wins;
        return { wins: best, names: players.filter(p => p.wins === best).map(p => lastName(p.id)) };
    }

    function renderStats(step) {
        const container = step.el.querySelector('[data-stats]');
        const rows = rowsForStep(step, state.rows.filter(inEra));
        if (step.type === 'big3') {
            renderBig3(step, rows);
            return;
        }
        if (!container) return;
        const players = groupWins(rows);
        if (!rows.length) {
            container.innerHTML = statHtml('—', 'Aucun titre sur cette période');
            return;
        }
        const record = recordHolders(players);
        const recordLabel = `titres, record de <strong>${record.names.slice(0, 2).join(', ')}${record.names.length > 2 ? '…' : ''}</strong>`;
        if (step.type === 'tournament') {
            const last = rows.reduce((a, b) => (b.year > a.year ? b : a));
            container.innerHTML =
                statHtml(record.wins, recordLabel) +
                statHtml(players.length, 'champions différents') +
                statHtml(last.year, `dernier titre : <strong>${lastName(last.winner)}</strong>`);
        } else {
            container.innerHTML =
                statHtml(rows.length, 'titres distribués') +
                statHtml(players.length, 'champions différents') +
                statHtml(record.wins, recordLabel);
        }
    }

    function renderBig3(step, rows) {
        const container = step.el.querySelector('[data-big3]');
        const lines = [
            ['Grand Chelem', r => r.category === 'Grand Slam'],
            ['Masters 1000', r => r.category === 'Masters 1000'],
            ['ATP Finals', r => r.category === 'ATP Finals']
        ];
        const count = (player, test) => rows.filter(r => r.winner === player && test(r)).length;
        const cells = (test, tag) => {
            const values = BIG3.map(p => count(p, test));
            const best = Math.max(...values);
            return values.map(v => `<${tag} class="${v === best && v > 0 ? 'is-best' : ''}">${v}</${tag}>`).join('');
        };
        container.innerHTML = `
            <table>
                <thead><tr><th></th>${BIG3.map(p => `<th><img src="${photo(p)}" alt="">${lastName(p)}</th>`).join('')}</tr></thead>
                <tbody>${lines.map(([label, test]) => `<tr><td>${label}</td>${cells(test, 'td')}</tr>`).join('')}</tbody>
                <tfoot><tr><td>Total</td>${cells(() => true, 'td')}</tr></tfoot>
            </table>`;
    }

    function renderNote(step) {
        const note = step.el.querySelector('[data-note]');
        if (!note) return;
        const parts = [];
        if (state.tracked && step.type !== 'hero') {
            const name = `<strong>${escapeHtml(state.tracked)}</strong>`;
            const wins = rowsForStep(step, state.rows.filter(inEra)).filter(r => r.winner === state.tracked).length;
            if (wins) {
                parts.push(`${name} : ${plural(wins, 'titre')} ici.`);
            } else if (step.type === 'big3') {
                parts.push(`${name} ne fait pas partie du Big 3.`);
            } else {
                parts.push(`${name} n'a jamais gagné ici${eraIsFull() ? '' : ' sur cette période'}.`);
            }
        }
        if (!eraIsFull()) parts.push(`Période affichée : ${state.era[0]} – ${state.era[1]}.`);
        note.innerHTML = parts.join(' ');
        note.hidden = parts.length === 0;
    }

    function decorateCards() {
        document.querySelectorAll('.step[data-step="tournament"]').forEach(el => {
            const t = TOURNAMENTS.get(el.dataset.tournament);
            const title = el.querySelector('.card__title');
            title.insertAdjacentHTML('beforebegin',
                `<p class="eyebrow">${CATEGORIES[t.category].label}<span class="tag">${SURFACES[t.surface].label}</span></p>`);
            title.insertAdjacentHTML('afterend', `<p class="meta">${t.place}</p>`);
        });
    }

    // ---------- Progress navigation ----------
    const progressGroups = [
        { id: 'intro', label: 'Intro' },
        { id: 'Grand Slam', label: 'Grand Chelem' },
        { id: 'Masters 1000', label: 'Masters 1000' },
        { id: 'ATP Finals', label: 'Finale' }
    ];
    let steps = [];

    function buildProgress() {
        const nav = document.querySelector('.progress');
        nav.innerHTML = progressGroups.map(g => `
            <div class="progress__group" data-group="${g.id}">
                <span class="progress__label">${g.label}</span>
                <div class="progress__dots">${steps.filter(s => s.group === g.id).map(s =>
                    `<button class="progress__dot" data-index="${steps.indexOf(s)}" aria-label="${escapeHtml(s.title)}" title="${escapeHtml(s.title)}"></button>`).join('')}</div>
            </div>`).join('') + '<span class="progress__current"></span>';
        nav.addEventListener('click', event => {
            const dot = event.target.closest('.progress__dot');
            if (dot) steps[+dot.dataset.index].el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        });
    }

    function updateProgress(step) {
        const index = steps.indexOf(step);
        document.querySelectorAll('.progress__dot').forEach(dot => {
            const i = +dot.dataset.index;
            dot.classList.toggle('is-current', i === index);
            dot.classList.toggle('is-done', i < index);
        });
        document.querySelectorAll('.progress__group').forEach(g => g.classList.toggle('is-current', g.dataset.group === step.group));
        document.querySelector('.progress__current').textContent = step.type === 'hero' ? '' : step.title;
    }

    // ---------- Player card ----------
    const card = document.getElementById('playerCard');
    let chart;

    function showPlayer(id, { pin = false } = {}) {
        if (!id) {
            if (!state.pinned) {
                card.hidden = true;
                chart.setSelected(null);
            }
            return;
        }
        if (state.pinned && !pin && state.pinned !== id) return;
        if (pin) state.pinned = id;
        card.classList.toggle('is-pinned', Boolean(state.pinned));

        const rows = state.rows.filter(r => r.winner === id).sort((a, b) => a.year - b.year);
        const step = state.step;
        const here = step ? rowsForStep(step, rows) : rows;
        const byCategory = cat => rows.filter(r => r.category === cat).length;
        const hereText = step && step.type === 'tournament'
            ? (here.length ? `${plural(here.length, 'titre')} à ${TOURNAMENTS.get(step.key).name}` : `Jamais titré à ${TOURNAMENTS.get(step.key).name}`)
            : `${rows[0].year} – ${rows[rows.length - 1].year}`;

        card.querySelector('.player-card__photo').src = photo(id);
        card.querySelector('.player-card__name').textContent = id;
        card.querySelector('.player-card__sub').textContent = hereText;
        card.querySelector('.player-card__figures').innerHTML = [
            [byCategory('Grand Slam'), 'Grand Chelem'],
            [byCategory('Masters 1000'), 'Masters 1000'],
            [rows.length, 'Total']
        ].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('');

        const perTournament = d3.rollups(rows, v => v.length, r => r.tournament).sort((a, b) => b[1] - a[1]);
        card.querySelector('.player-card__chips').innerHTML = perTournament.map(([key, n]) =>
            `<li class="${step && step.key === key ? 'is-here' : ''}">${TOURNAMENTS.get(key).name}<b>${n}</b></li>`).join('');
        card.querySelector('#trackPlayer').textContent = state.tracked === id ? 'Ne plus suivre' : 'Suivre ce joueur';

        card.hidden = false;
        renderTimeline(rows, step);
        chart.setSelected(id);
    }

    function renderTimeline(rows, step) {
        const svg = d3.select(card.querySelector('.timeline'));
        const width = card.querySelector('.timeline').clientWidth || 330;
        const x = d3.scaleLinear().domain(state.bounds).range([6, width - 6]);
        svg.selectAll('*').remove();
        const axis = svg.append('g').attr('class', 'axis');
        axis.append('line').attr('x1', 0).attr('x2', width).attr('y1', 56).attr('y2', 56);
        const ticks = d3.range(Math.ceil(state.bounds[0] / 10) * 10, state.bounds[1] + 1, 20);
        axis.selectAll('text').data(ticks).join('text').attr('x', x).attr('y', 70).text(d => d);
        const stack = new Map();
        svg.selectAll('circle.dot').data(rows).join('circle')
            .attr('class', r => `dot${step && step.key === r.tournament ? ' is-here' : ''}`)
            .attr('cx', r => x(r.year))
            .attr('cy', r => {
                const level = stack.get(r.year) || 0;
                stack.set(r.year, level + 1);
                return 50 - level * 6.5;
            })
            .attr('r', 3.2)
            .attr('fill', r => SURFACES[TOURNAMENTS.get(r.tournament).surface].color);
    }

    function unpin() {
        state.pinned = null;
        card.classList.remove('is-pinned');
        card.hidden = true;
        chart.setSelected(null);
    }

    // ---------- Tracking ----------
    function setTracked(id) {
        state.tracked = id;
        chart.setTracked(id);
        const chip = document.getElementById('trackedChip');
        chip.hidden = !id;
        if (id) {
            chip.querySelector('.chip__avatar').src = photo(id);
            chip.querySelector('.chip__label').textContent = lastName(id);
            chip.setAttribute('aria-label', `Arrêter de suivre ${id}`);
        }
        if (state.step) renderNote(state.step);
        if (state.pinned) showPlayer(state.pinned, { pin: true });
    }

    // ---------- Explore panel ----------
    const explore = document.getElementById('explore');

    function openExplore(focusId) {
        unpin();
        explore.hidden = false;
        document.getElementById(focusId).focus();
    }

    function closeExplore() {
        explore.hidden = true;
    }

    function setupExplore(players) {
        document.getElementById('playerList').innerHTML = players.map(p => `<option value="${escapeHtml(p)}">`).join('');
        const search = document.getElementById('playerSearch');
        const pick = () => {
            const query = normalize(search.value);
            if (!query) return;
            const match = players.find(p => normalize(p) === query) || players.find(p => normalize(p).includes(query));
            if (match) {
                setTracked(match);
                search.value = '';
                closeExplore();
            }
        };
        search.addEventListener('change', pick);
        search.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });

        document.getElementById('openSearch').addEventListener('click', () => (explore.hidden ? openExplore('playerSearch') : closeExplore()));
        document.getElementById('openEra').addEventListener('click', () => (explore.hidden ? openExplore('eraMin') : closeExplore()));
        document.getElementById('closeExplore').addEventListener('click', closeExplore);
        document.getElementById('trackedChip').addEventListener('click', () => setTracked(null));
        document.addEventListener('click', e => {
            if (!explore.hidden && !explore.contains(e.target) && !e.target.closest('#openSearch, #openEra')) closeExplore();
        });

        // Era range
        const [minInput, maxInput] = [document.getElementById('eraMin'), document.getElementById('eraMax')];
        [minInput, maxInput].forEach(input => {
            input.min = state.bounds[0];
            input.max = state.bounds[1];
            input.step = 1;
        });
        minInput.value = state.bounds[0];
        maxInput.value = state.bounds[1];

        const presets = document.querySelector('.era-presets');
        presets.innerHTML = ERA_PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${p.label}</button>`).join('');
        presets.addEventListener('click', e => {
            const button = e.target.closest('button');
            if (!button) return;
            const range = ERA_PRESETS[+button.dataset.preset].range || [null, null];
            setEra(range[0] ?? state.bounds[0], range[1] ?? state.bounds[1]);
        });

        let pending = null;
        const onInput = event => {
            let lo = +minInput.value;
            let hi = +maxInput.value;
            if (lo > hi) {
                if (event.target === minInput) lo = hi;
                else hi = lo;
            }
            clearTimeout(pending);
            pending = setTimeout(() => setEra(lo, hi), 120);
            renderEraControls(lo, hi);
        };
        minInput.addEventListener('input', onInput);
        maxInput.addEventListener('input', onInput);
        renderEraControls(...state.era);
    }

    function renderEraControls(lo, hi) {
        const [min, max] = state.bounds;
        document.getElementById('eraMin').value = lo;
        document.getElementById('eraMax').value = hi;
        document.getElementById('eraMinValue').textContent = lo;
        document.getElementById('eraMaxValue').textContent = hi;
        const fill = document.querySelector('.range__fill');
        fill.style.left = `${(lo - min) / (max - min) * 100}%`;
        fill.style.right = `${(max - hi) / (max - min) * 100}%`;
        document.querySelectorAll('.era-presets button').forEach(button => {
            const range = ERA_PRESETS[+button.dataset.preset].range || [null, null];
            button.setAttribute('aria-pressed', String((range[0] ?? min) === lo && (range[1] ?? max) === hi));
        });
        document.getElementById('eraBadge').hidden = lo === min && hi === max;
    }

    function setEra(lo, hi) {
        state.era = [lo, hi];
        renderEraControls(lo, hi);
        steps.forEach(renderStats);
        if (state.step) refresh(state.step);
    }

    // ---------- Scrollytelling ----------
    function refresh(step) {
        const data = nodesForStep(step);
        const labels = { hero: 0, overview: 5, category: 6, big3: 3 }[step.type] ?? 5;
        chart.update(data, { drift: step.type === 'hero', labels });
        chart.setTracked(state.tracked);
        document.getElementById('chartEmpty').hidden = data.length > 0;
        renderNote(step);
    }

    function activate(el) {
        const step = steps.find(s => s.el === el);
        if (!step || step === state.step) return;
        state.step = step;
        steps.forEach(s => s.el.classList.toggle('is-active', s === step));
        document.documentElement.style.setProperty('--accent', step.accent);
        setBackdrop(step.bg);
        updateProgress(step);
        refresh(step);
        if (state.pinned) showPlayer(state.pinned, { pin: true });
        else card.hidden = true;
    }

    function animateCounters(rows) {
        const values = {
            champions: new Set(rows.map(r => r.winner)).size,
            titles: rows.length,
            seasons: state.bounds[1] - state.bounds[0] + 1
        };
        document.querySelectorAll('[data-count]').forEach(el => {
            const target = values[el.dataset.count];
            if (reduceMotion) {
                el.textContent = target;
                return;
            }
            d3.select(el).transition().delay(300).duration(1800).ease(d3.easeCubicOut)
                .tween('text', () => t => { el.textContent = Math.round(target * t); });
        });
    }

    function init(rows) {
        state.rows = rows.filter(r => TOURNAMENTS.has(r.tournament));
        state.bounds = d3.extent(state.rows, r => r.year);
        state.era = [...state.bounds];

        decorateCards();
        steps = [...document.querySelectorAll('.step')].map(describeStep);
        buildProgress();

        chart = createBubbleChart(document.getElementById('chart'), {
            onHover: d => (coarsePointer ? null : showPlayer(d ? d.id : null)),
            onSelect: d => (state.pinned === d.id ? unpin() : showPlayer(d.id, { pin: true }))
        });

        const players = [...new Set(state.rows.map(r => r.winner))].sort((a, b) => a.localeCompare(b));
        setupExplore(players);
        steps.forEach(renderStats);
        animateCounters(state.rows);
        document.getElementById('year').textContent = new Date().getFullYear();

        document.getElementById('closePlayer').addEventListener('click', unpin);
        document.getElementById('trackPlayer').addEventListener('click', () => {
            setTracked(state.tracked === state.pinned ? null : state.pinned);
            unpin();
        });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            closeExplore();
            unpin();
        });

        activate(steps[0].el);
        const scroller = scrollama();
        const setup = () => scroller.setup({ step: '.step', offset: mobileQuery.matches ? 0.62 : 0.5 })
            .onStepEnter(({ element }) => activate(element));
        setup();
        mobileQuery.addEventListener('change', () => {
            scroller.destroy();
            setup();
        });

        // Warm the cache so backdrops cross-fade instantly
        const preload = () => steps.forEach(s => { new Image().src = `./data/images/backgrounds/${s.bg}.jpg`; });
        if ('requestIdleCallback' in window) requestIdleCallback(preload);
        else setTimeout(preload, 2000);
    }

    d3.csv('data/tennis/scrap_results.csv', d => ({
        year: +d.YEAR,
        category: d.TOURNAMENT_TYPE,
        tournament: d.TOURNAMENT,
        winner: d.WINNER
    })).then(init);
})();
