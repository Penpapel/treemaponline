// Get full window dimensions dynamically for full-screen effect with padding
const width = window.innerWidth * 0.95; // 5% white padding around the treemap
const height = window.innerHeight * 0.95;

// Define the treemap layout
const treemap = d3.treemap()
    .size([width, height])
    .padding(3) // Slight padding between cells
    .round(true);

// Create an SVG element to contain the treemap
const svg = d3.select("#treemap")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("padding", "20px") // Add padding around the treemap inside the SVG
    .style("background-color", "#ffffff"); // White background for padding effect

// Function to generate random hierarchical data
function generateRandomData(depth = 3, maxChildren = 4) {
    const createNode = (level) => {
        if (level >= depth) {
            return { name: `Leaf-${Math.random().toString(36).substring(7)}`, value: Math.floor(Math.random() * 500) };
        }

        const numChildren = Math.floor(Math.random() * maxChildren) + 1;
        return {
            name: `Node-${Math.random().toString(36).substring(7)}`,
            children: Array.from({ length: numChildren }, () => createNode(level + 1)),
        };
    };

    return createNode(0);
}

// Function to generate a color gradient for a given treemap level
function generateColorGradient(baseColor) {
    return d3.scaleLinear()
        .domain([0, 1])
        .range([d3.lab(baseColor).brighter(1.2), d3.lab(baseColor).darker(1.2)]);
}

// Define color palettes for each level
const colorPalettes = [
    generateColorGradient("#ff6347"), // Level 1 (tomato)
    generateColorGradient("#4682b4"), // Level 2 (steel blue)
    generateColorGradient("#3cb371")  // Level 3 (medium sea green)
];

// Function to render the treemap with given data
function renderTreemap(data) {
    const root = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    treemap(root);

    // Select and bind the data for the nodes
    const nodes = svg.selectAll("g")
        .data(root.leaves(), d => d.data.name); // Use the node name as the key

    // Enter new nodes
    const enteringNodes = nodes.enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .on("click", function(event, d) {
            morphToCircle(d3.select(this).select("rect"), d, () => {
                const newData = generateRandomData();
                morphToNewTreemap(newData);
            });
        });

    // Add the inner rectangle for the cell content
    enteringNodes.append("rect")
        .attr("id", d => d.data.name)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => {
            const level = getTreemapLevel(d);
            return colorPalettes[level](Math.random()); // Assign gradient color based on level
        })
        .attr("class", "leaf")
        .attr("rx", 8) // Slightly rounded corners
        .attr("ry", 8);

    // Add centered text labels
    enteringNodes.append("text")
        .attr("x", d => (d.x1 - d.x0) / 2) // Horizontally centered
        .attr("y", d => (d.y1 - d.y0) / 2) // Vertically centered
        .attr("dy", "0.35em") // Align text vertically
        .text(d => d.data.name)
        .attr("class", "label")
        .attr("font-family", "Arial")
        .attr("text-anchor", "middle"); // Center the text anchor horizontally

    // Update the positions and sizes of existing nodes with a transition
    nodes.transition()
        .duration(1000) // 1-second morphing transition
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodes.select("rect.leaf").transition()
        .duration(1000)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    nodes.select("text").transition()
        .duration(1000)
        .attr("x", d => (d.x1 - d.x0) / 2) // Ensure text is centered after transition
        .attr("y", d => (d.y1 - d.y0) / 2); // Ensure text is vertically centered

    // Remove nodes that no longer exist
    nodes.exit().remove();
}

// Helper function to determine the level of a treemap node
function getTreemapLevel(d) {
    let level = 0;
    while (d.parent) {
        d = d.parent;
        level++;
    }
    return Math.min(level, colorPalettes.length - 1); // Cap the level to available color palettes
}

// Step 1: Morph clicked cell into a small circle (1/10th of the original size)
function morphToCircle(rect, data, callback) {
    const width = data.x1 - data.x0;
    const height = data.y1 - data.y0;

    // Scale down from center
    rect.transition()
        .duration(800)
        .attr("rx", Math.min(width, height) / 2) // Make it a circle
        .attr("ry", Math.min(width, height) / 2) // Make it a circle
        .attr("width", width / 10) // Shrink to 1/10 of original width
        .attr("height", height / 10) // Shrink to 1/10 of original height
        .attr("x", width / 2 - (width / 10) / 2) // Center horizontally
        .attr("y", height / 2 - (height / 10) / 2) // Center vertically
        .on("end", callback); // After the transition, call the callback (morph back)
}

// Step 2: Morph to a new treemap and then morph cells back from circle to rounded rectangles
function morphToNewTreemap(newData) {
    const root = d3.hierarchy(newData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    treemap(root);

    const nodes = svg.selectAll("g")
        .data(root.leaves(), d => d.data.name); // Use the node name as the key

    const enteringNodes = nodes.enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .on("click", function(event, d) {
            morphToCircle(d3.select(this).select("rect"), d, () => {
                const newData = generateRandomData();
                morphToNewTreemap(newData); // Morph to next treemap
            });
        });

    // New rects start at 1/10 size and scale up
    enteringNodes.append("rect")
        .attr("id", d => d.data.name)
        .attr("width", d => (d.x1 - d.x0) / 10)
        .attr("height", d => (d.y1 - d.y0) / 10)
        .attr("x", d => (d.x1 - d.x0) / 2 - ((d.x1 - d.x0) / 10) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2 - ((d.y1 - d.y0) / 10) / 2)
        .attr("fill", d => {
            const level = getTreemapLevel(d);
            return colorPalettes[level](Math.random()); // Assign gradient color based on level
        })
        .attr("class", "leaf")
        .attr("rx", 10)
        .attr("ry", 10)
        .transition()
        .duration(1000)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("x", 0)
        .attr("y", 0);

    // Add centered text labels
    enteringNodes.append("text")
        .attr("x", d => (d.x1 - d.x0) / 2) // Center text horizontally
        .attr("y", d => (d.y1 - d.y0) / 2) // Center text vertically
        .attr("dy", "0.35em") // Align vertically in the middle
        .text(d => d.data.name)
        .attr("class", "label")
        .attr("font-family", "Arial")
        .attr("text-anchor", "middle"); // Ensure text is anchored in the middle

    // Morph back from circles to cells with rounded corners
    nodes.transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodes.select("rect.leaf").transition()
        .duration(1000)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    nodes.select("text").transition()
        .duration(1000)
        .attr("x", d => (d.x1 - d.x0) / 2) // Ensure text is centered after transition
        .attr("y", d => (d.y1 - d.y0) / 2); // Ensure text is vertically centered

    // Remove old nodes that are no longer in the new data
    nodes.exit().remove();
}

// Initial rendering of the treemap with random data
const initialData = generateRandomData();
renderTreemap(initialData);
