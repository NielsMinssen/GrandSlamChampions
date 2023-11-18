document.addEventListener('DOMContentLoaded', function () {

    var menu = document.getElementById('menu');
    menu.style.right = '+100%';

    // This function toggles the menu's visibility
    window.toggleMenu = function () {
        var menu = document.getElementById('menu');
        menu.style.right = (menu.style.right === '0px' || menu.style.right === '') ? '+100%' : '0px';
    }

    // Function to scroll to the tournament section
    window.scrollToTournament = function (tournamentName) {
        var steps = document.querySelectorAll('.step');

        for (var i = 0; i < steps.length; i++) {
            if (steps[i].getAttribute('data-tournament') === tournamentName) {
                steps[i].scrollIntoView({ behavior: 'smooth' });
                // Close the menu after scrolling
                toggleMenu();
                break;
            }
        }
    }

    lottie.loadAnimation({
        container: document.getElementById('down-arrow1'), // ID de l'élément conteneur
        renderer: 'svg', // Peut être 'canvas', 'html'
        loop: true, // Boucle de l'animation
        autoplay: true, // Lecture automatique
        path: './data/lottie/down-arrow.json' // Chemin du fichier JSON de l'animation
    });

    lottie.loadAnimation({
        container: document.getElementById('down-arrow2'), // ID de l'élément conteneur
        renderer: 'svg', // Peut être 'canvas', 'html'
        loop: true, // Boucle de l'animation
        autoplay: true, // Lecture automatique
        path: './data/lottie/down-arrow.json' // Chemin du fichier JSON de l'animation
    });

    lottie.loadAnimation({
        container: document.getElementById('down-arrow3'), // ID de l'élément conteneur
        renderer: 'svg', // Peut être 'canvas', 'html'
        loop: true, // Boucle de l'animation
        autoplay: true, // Lecture automatique
        path: './data/lottie/down-arrow.json' // Chemin du fichier JSON de l'animation
    });

    lottie.loadAnimation({
        container: document.getElementById('down-arrow4'), // ID de l'élément conteneur
        renderer: 'svg', // Peut être 'canvas', 'html'
        loop: true, // Boucle de l'animation
        autoplay: true, // Lecture automatique
        path: './data/lottie/down-arrow.json' // Chemin du fichier JSON de l'animation
    });

    function bubbleChart() {
        var width = 900;
        var height = 700;
        var maxRange =60;

        if (window.innerWidth < 1000) {
            width = 273;
            height = 675;
            maxRange = 40;
        }

        const centre = { x: width / 2, y: height / 2 };
        const forceStrength = 0.01;

        let svg = null;
        let bubbles = null;
        let labels = null;
        let images = null;
        let nodes = [];

        function charge(d) {
            return Math.pow(d.radius, 2.0) * 0.01;
        }

        const simulation = d3.forceSimulation()
            .force('charge', d3.forceManyBody().strength(charge))
            .force('x', d3.forceX().strength(forceStrength).x(centre.x))
            .force('y', d3.forceY().strength(forceStrength).y(centre.y))
            .force('collision', d3.forceCollide().radius(d => d.radius + 2));

        simulation.stop();

        function createNodes(rawData, tournament) {
            const filteredData = rawData.filter(d => d.TOURNAMENT === tournament);
            const maxWins = d3.max(filteredData, d => +d.NBWINS);
            const radiusScale = d3.scaleSqrt()
                .domain([0, maxWins])
                .range([10, maxRange]);
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
            const myNodes = filteredData.map((d, i) => ({
                ...d,
                radius: radiusScale(+d.NBWINS),
                NBWINS: +d.NBWINS,
                x: Math.random() * (width - 100) + 50,
                y: Math.random() * (height - 100) + 50,
                color: colorScale(i),
                id: `${tournament}-${i}`,  // Concatenate tournament name with existing id
            }));

            return myNodes;
        }

        let chart = function chart(selector, rawData, tournament) {
            nodes = createNodes(rawData, tournament);

            // Remove existing SVG if it exists
            d3.select(selector).select('svg').remove();

            // Create a new SVG
            svg = d3.select(selector)
                .append('svg')
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr('class', 'svg')

            const elements = svg.selectAll('.bubble')
                .data(nodes, d => d.id)
                .enter()
                .append('g')
                .attr('class', 'g') // Apply the class
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));

            bubbles = elements
                .append('circle')
                .attr('r', d => d.radius)
                .attr('fill', 'white')
                .attr('class', 'bubble') // Apply the class
                .on('mouseover', showDetails)
                .on('mouseout', hideDetails);

            images = elements
                .append('image')
                .attr('width', d => 2 * d.radius)
                .attr('height', d => 2 * d.radius)
                .attr('xlink:href', d => {
                    const imageName = d.WINNER.replace(/ /g, "_");
                    const imageUrl = `data/images/atp/${imageName}.png`;

                        return imageUrl;
                })
                .on('mouseover', showDetails)
                .on('mouseout', hideDetails);


            simulation.nodes(nodes)
                .on('tick', ticked)
                .alpha(1)
                .restart();
        }

        function ticked() {
            bubbles
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
            images
                .attr('x', d => d.x - d.radius)
                .attr('y', d => d.y - d.radius)
        }

        function showDetails(d) {
            const tooltip = d3.select("#tooltip");
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            var tooltipWidth = 200; // Set the width of the tooltip image

            if (window.innerWidth < 1000) {
                tooltipWidth=300;
            }

            // Calculate the top position so that the tooltip is centered in the viewport
            const topPosition = scrollY + (windowHeight / 2);

            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`
                <img src="./data/images/atp/${d.WINNER.replace(/ /g, "_")}.png" alt="Image de ${d.WINNER}" style="width:${tooltipWidth}px; height:auto;">
                <div class='tooltip'>
                    ${d.WINNER}<br>
                    ${d.NATIONALITY}<br>
                    ${d.AGE}<br>
                    ${d.HEIGHT}<br>
                    Nombre de victoire(s): ${d.NBWINS}<br>
                    Année(s) de victoire(s): <span style="display: inline-block; word-wrap: break-word; max-width: ${tooltipWidth}px;">${d.YEARS_WON.join(', ')}</span>
                </div>
            `)
                .style("right", "30px") // Position 10px from the right edge of the screen
                .style("top", `${topPosition}px`) // Center based on the current scroll position
                .style("transform", "translateY(-50%)"); // Center the tooltip vertically relative to its height
        }

        function hideDetails() {
            const tooltip = d3.select("#tooltip");
            tooltip.transition().duration(500).style("opacity", 0);
        }

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return chart;
    }

    // Create separate instances for each tournament
    let frenchOpenChart = bubbleChart();
    let wimbledonChart = bubbleChart();
    let australianOpenChart = bubbleChart();
    let usOpenChart = bubbleChart();
    let IndianWellsMastersChart = bubbleChart();
    let MiamiOpenChart = bubbleChart();
    let MonteCarloMastersChart = bubbleChart();
    let MadridOpenChart = bubbleChart();
    let ItalianOpenChart = bubbleChart();
    let CanadianOpenChart = bubbleChart();
    let CincinatiMastersChart = bubbleChart();
    let ShangaiMastersChart = bubbleChart();
    let ParisMastersChart = bubbleChart();
    let ATPFinalsChart = bubbleChart();

    let uniqueYears, uniqueWinners,filteredData;

    d3.csv('data/tennis/scrap_results_aggregated.csv').then(data => {
        allData = data.map(d => {
            // Parse the YEARS_WON string into an array of numbers
            d.YEARS_WON = JSON.parse(d.YEARS_WON).map(Number);
            return d;
        });
    
        // Flatten the array of years and then get unique values
        uniqueYears = [...new Set(allData.flatMap(d => d.YEARS_WON))].sort((a, b) => b - a);
        uniqueWinners = [...new Set(allData.map(d => d.WINNER))].sort();
    
        populateFilterMenus(uniqueYears, 'yearFilter');
        populateFilterMenus(uniqueWinners, 'winnerFilter');
    
        filteredData = allData; // Initialize filteredData with all data
    });

    // This function now needs to handle multiple selected options
function getSelectedOptions(sel) {
    const opts = [];
    for (let i = 0; i < sel.options.length; i++) {
        const opt = sel.options[i];
        if (opt.selected) {
            opts.push(opt.value);
        }
    }
    return opts;
}

$(document).ready(function() {
    $('#yearFilter').select2({
        placeholder: "Toutes",
        allowClear: true
    });
    $('#winnerFilter').select2({
        placeholder: "Tous",
        allowClear: true
    });
});


    function populateFilterMenus(options, elementId) {
        const select = document.getElementById(elementId);
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }
    
 
// Call this function whenever a filter changes.
function applyFilters() {
    // Get the selected years and winners from the filters.
    const yearsSelected = getSelectedOptions(document.getElementById('yearFilter')).map(Number);
    const winnersSelected = getSelectedOptions(document.getElementById('winnerFilter'));

    d3.csv('data/tennis/scrap_results_aggregated.csv').then(data => {
        allData = data.map(d => {
            // Parse the YEARS_WON string into an array of numbers
            d.YEARS_WON = JSON.parse(d.YEARS_WON).map(Number);
            return d;
        });
    });

    // Filter the data based on the selected years and winners.
    filteredData = allData.filter(d =>
        (yearsSelected.length === 0 || yearsSelected.some(year => d.YEARS_WON.includes(year))) &&
        (winnersSelected.length === 0 || winnersSelected.includes(d.WINNER))
    );

    // Adjust the YEARS_WON array and NBWINS for the filtered data.
    filteredData.forEach(d => {
        d.YEARS_WON = d.YEARS_WON.filter(year => yearsSelected.includes(year));
        d.NBWINS = d.YEARS_WON.length;
    });

    updateChart(tournament);

}


// Event listeners for the filter dropdowns.
$('#yearFilter').on('change', applyFilters);
$('#winnerFilter').on('change', applyFilters);


    // Add a tooltip element
    d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("opacity", 0);



    async function updateChart(tournament) {
        // Logic to update the chart based on the tournament
        // You can switch between different datasets or views here
        switch (tournament) {
            case 'French Open':
                frenchOpenChart('#chart', filteredData, 'French Open');
                break;
            case 'Wimbledon':
                wimbledonChart('#chart', filteredData, 'Wimbledon');
                break;
            case 'Australian Open':
                australianOpenChart('#chart', filteredData, 'Australian Open');
                break;
            case 'US Open':
                usOpenChart('#chart', filteredData, 'US Open');
                break;
            case 'Indian Wells Masters':
                IndianWellsMastersChart('#chart', filteredData, 'Indian Wells Masters');
                break;
            case 'Miami Open':
                MiamiOpenChart('#chart', filteredData, 'Miami Open');
                break;
            case 'Monte-Carlo Masters':
                MonteCarloMastersChart('#chart', filteredData, 'Monte-Carlo Masters');
                break;
            case 'Madrid Open':
                MadridOpenChart('#chart', filteredData, 'Madrid Open');
                break;
            case 'Italian Open':
                ItalianOpenChart('#chart', filteredData, 'Italian Open');
                break;
            case 'Canadian Open':
                CanadianOpenChart('#chart', filteredData, 'Canadian Open');
                break;
            case 'Cincinnati Masters':
                CincinatiMastersChart('#chart', filteredData, 'Cincinnati Masters');
                break;
            case 'Shanghai Masters':
                ShangaiMastersChart('#chart', filteredData, 'Shanghai Masters');
                break;
            case 'Paris Masters':
                ParisMastersChart('#chart', filteredData, 'Paris Masters');
                break;
            case 'ATP Finals':
                ATPFinalsChart('#chart', filteredData, 'ATP Finals')
        }
    }

    // Fonction pour démarrer le spinner
    function startSpinner() {
        // Ajoute le spinner à la page avec 'display: block'
        document.getElementById('loader').style.display = 'block';
    }

    // Fonction pour arrêter le spinner
    function stopSpinner() {
        // Enlève le spinner de la page avec 'display: none'
        document.getElementById('loader').style.display = 'none';
    }


    let chart
    const scroller = scrollama();

    scroller
        .setup({
            step: '.step', // select all steps
            offset: 0.4, // trigger the step at middle of the viewport
            // other options...
        })
        .onStepEnter(response => {
            startSpinner();
            // Get the tournament attribute of the current step
            window.tournament = response.element.getAttribute('data-tournament');
            const newBackgroundImage = response.element.getAttribute('data-background');

            if (tournament == 'French Open' && response.direction === 'down') {

            } else {
                document.body.style.backgroundImage = `url('${newBackgroundImage}')`;
            }

            // Fade out any graph that might currently be displayed
            d3.select('#chart')
                .transition()
                .duration(750)
                .style('opacity', 0)
                .on('end', () => {
                    // Once the fade out is complete, update the chart with new data and fade it in
                    // Utilisez setTimeout pour différer la mise à jour du graphique
                    requestAnimationFrame(() => {
                        updateChart(tournament).then(() => {
                            stopSpinner();
                            // Affichez le graphique
                            d3.select('#chart')
                                .transition()
                                .duration(750)
                                .style('opacity', 1);
                        });
                    });
                });
        });

        document.getElementById('scrollToTopBtn').addEventListener('click', function() {
            window.scrollTo({
                top: 0, // Scroll to the top of the page
                behavior: 'smooth' // Smooth scrolling
            });
        });
        

    // Resize handler
    window.addEventListener('resize', scroller.resize);
});