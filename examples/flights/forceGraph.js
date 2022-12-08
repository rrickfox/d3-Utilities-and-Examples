// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraph({
        nodes, // an iterable of node objects (typically [{id}, …])
        links // an iterable of link objects (typically [{source, target}, …])
    }, {
        nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
        nodeGroup, // given d in nodes, returns an (ordinal) value for color
        nodeValue,
        nodeGroups, // an array of ordinal values representing the node groups
        nodeTitle, // given d in nodes, a title string
        nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
        nodeStroke = "#fff", // node stroke color
        nodeStrokeWidth = 1.5, // node stroke width, in pixels
        nodeStrokeOpacity = 1, // node stroke opacity
        nodeRadius, // node radius, in pixels
        nodeStrength,
        linkSource = ({source}) => source, // given d in links, returns a node identifier string
        linkTarget = ({target}) => target, // given d in links, returns a node identifier string
        linkStroke = "#999", // link stroke color
        linkStrokeOpacity = 0.6, // link stroke opacity
        // linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
        linkStrokeWidthRange = [0.5, 10],
        linkStrokeLinecap = "round", // link stroke linecap
        linkStrength,
        linkLengthRange = [20, 200],
        colors = d3.schemeCategory10, // an array of color strings, for the node groups
        width = 640, // outer width, in pixels
        height = 400, // outer height, in pixels
        margin = {top: 10, right: 60, bottom: 10, left: 60},
        invalidation // when this promise resolves, stop the simulation
    } = {}) {
        // Compute values.
        const N = nodes.map(nodeId).map(intern);
        const LS = links.map(linkSource).map(intern);
        const LT = links.map(linkTarget).map(intern);
        const LF = links.map(linkStrength).map(intern)
        const G = nodeGroup == null ? null : nodes.map(nodeGroup).map(intern);
        const T = nodeTitle == null ? null : nodes.map(nodeTitle);
        const V = nodeValue == null ? null : nodes.map(nodeValue).map(intern);
        // const W = typeof linkStrokeWidth !== "function" ? null : links.map(linkStrokeWidth);
        // const L = typeof linkStroke !== "function" ? null : links.map(linkStroke);
    
        // Replace the input nodes and links with mutable objects for the simulation.
        nodes = nodes.map((_, i) => ({id: N[i], group: G[i], title: T[i], value: V[i]}));
        links = links.map((_, i) => ({source: LS[i], target: LT[i], length: LF[i]}));
    
        // Construct the scales.
        const color = d3.scaleOrdinal()
            .domain(Array.from(new Set(G)).sort(d3.ascending))
            .range(colors);
        const linkLength = d3.scalePow()
            .exponent(2)
            .domain(d3.extent(LF))
            .range(linkLengthRange.reverse())
        const linkStrokeWidth = d3.scalePow()
            .exponent(2)
            .domain(d3.extent(LF))
            .range(linkStrokeWidthRange)

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => linkLength(d.length)).strength(1))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width/2, height/2))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .on("tick", ticked)

        const svg = d3.create("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        const svg_g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // console.log(links)
        const link = svg_g.append("g")
            .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
            .attr("stroke-opacity", linkStrokeOpacity)
            .attr("stroke-linecap", linkStrokeLinecap)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => linkStrokeWidth(d.length))
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    
        const node = svg_g.append("g")
            .attr("fill", nodeFill)
            .attr("stroke", nodeStroke)
            .attr("stroke-opacity", nodeStrokeOpacity)
            .attr("stroke-width", nodeStrokeWidth)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", nodeRadius)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", d => color(d.group))
        
        node.append("title")
            .text(function(d) {
                let title = []
                for(key of Object.getOwnPropertyNames(d.title))  {
                    title.push(key + ": " + d.title[key])
                }
                return title.join("\n")
            })
        
        let drag_handler = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
      
        drag_handler(node);
      

        // if (W) link.attr("stroke-width", ({index: i}) => W[i]);
        // if (L) link.attr("stroke", ({index: i}) => L[i]);
        // if (G) node.attr("fill", ({index: i}) => color(G[i]));
        // if (T) node.append("title").text(({index: i}) => T[i]);
        // if (invalidation != null) invalidation.then(() => simulation.stop());

        function intern(value) {
            return value !== null && typeof value === "object" ? value.valueOf() : value;
        }

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            // console.log(nodes)
        }

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
          
        function dragged(d) {
            d.fx = validate(d3.event.x, 0, width);
            d.fy = validate(d3.event.y, 0, height);
        }
          
        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function validate(x, a, b) {
            if (x < a) x = a;
            if (x > b) x = b;
            return x;
        }
    
        simulation.restart()
        // svg.call(drag(simulation).subject(({x, y}) => simulation.find(x - width / 2, y - height / 2)))
        return Object.assign(svg.node(), {scales: {color}});
    }