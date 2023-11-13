document.addEventListener('DOMContentLoaded', function () {

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
        const width = 700;
        const height = 600;

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
                .range([10, 60]);
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
                .attr("viewBox", `0 0 700 600`)
                .attr('class','svg')

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
                    const imageName = encodeURIComponent(d.WINNER);
                    const imageUrl = `data/images/${imageName}.png`;

                    // Check if the image file exists before setting the URL
                    if (imageExists(imageUrl)) {
                        return imageUrl;
                    } else {
                        // Provide a default image
                        return 'data/images/Novak%20Djokovic.png'; // Adjust URL encoding if needed
                    }
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
            const tooltipWidth = 200; // Set the width of the tooltip image

            // Calculate the top position so that the tooltip is centered in the viewport
            const topPosition = scrollY + (windowHeight / 2);

            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`
                <img src="./data/images/${d.WINNER}.png" alt="Image de ${d.WINNER}" style="width:${tooltipWidth}px; height:auto;">
                <div class='tooltip'>
                    ${d.WINNER}<br>
                    ${d.WINNER_NATIONALITY}<br>
                    ${d.WINNER_LEFT_OR_RIGHT_HANDED}<br>
                    Nombre de victoire(s): ${d.NBWINS}<br>
                    Année(s) de vivtoire(s) ${d.YEARS_WON}
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


    let allData;
    d3.csv('data/tennis/winner_by_tournaments.csv').then(data => {
        allData = data; // Store the data
    });


    function imageExists(url) {
        const http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send();
        return http.status !== 404;
    }

    // Add a tooltip element
    d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("opacity", 0);



    async function updateChart(tournament) {
        // Logic to update the chart based on the tournament
        // You can switch between different datasets or views here
        switch (tournament) {
            case 'French Open':
                frenchOpenChart('#chart', allData, 'French Open');
                break;
            case 'Wimbledon':
                wimbledonChart('#chart', allData, 'Wimbledon');
                break;
            case 'Australian Open':
                australianOpenChart('#chart', allData, 'Australian Open');
                break;
            case 'U.S. Open':
                usOpenChart('#chart', allData, 'U.S. Open');
                break;
            // Additional cases as needed
        }
    }

    // Define a variable to hold the animation instance
let bubbleChartLoadingAnimation;

// Function to start the Lottie animation for the bubble chart
function startBubbleChartLoadingAnimation() {
    // Make the container visible
  document.getElementById('tennis-bounce').style.display = 'block';
  // Only start the animation if it's not already running
  if (!bubbleChartLoadingAnimation) {
    bubbleChartLoadingAnimation = lottie.loadAnimation({
      container: document.getElementById('tennis-bounce'), // The container element
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: './data/lottie/tennis-bounce.json' // The path to the animation JSON
    });
  }
}

// Function to stop the Lottie animation for the bubble chart
function stopBubbleChartLoadingAnimation() {
  if (bubbleChartLoadingAnimation) {
    bubbleChartLoadingAnimation.stop();
    document.getElementById('tennis-bounce').style.display = 'none';
    bubbleChartLoadingAnimation.destroy(); // Optional: this frees up resources and allows you to start it again later
    bubbleChartLoadingAnimation = null; // Clear the variable so you can start it again if needed
  }
}

    let chart
    const scroller = scrollama();

    scroller
        .setup({
            step: '.step', // select all steps
            offset: 0.4, // trigger the step at middle of the viewport
            // other options...
        })
        .onStepEnter( response => {
            startBubbleChartLoadingAnimation();
            // Get the tournament attribute of the current step
            const tournament = response.element.getAttribute('data-tournament');
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
                .on('end', async () => {
                    // Once the fade out is complete, update the chart with new data and fade it in
                    await updateChart(tournament);
                    stopBubbleChartLoadingAnimation();
                    d3.select('#chart')
                        .transition()
                        .duration(750)
                        .style('opacity', 1);
                });
        });

    // Resize handler
    window.addEventListener('resize', scroller.resize);
});