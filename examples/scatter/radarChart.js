/////////////////////////////////////////////////////////
/////////////// The Radar Chart Function ////////////////
/// mthh - 2017 /////////////////////////////////////////
// Inspired by the code of alangrafu and Nadieh Bremer //
// (VisualCinnamon.com) and modified for d3 v4 //////////
// Reworked to fit needs by Richard Fuchs ///////////////
/////////////////////////////////////////////////////////
// http://bl.ocks.org/mthh/7e17b680b35b83b49f1c22a3613bd89f

const max = Math.max;
const sin = Math.sin;
const cos = Math.cos;
const HALF_PI = Math.PI / 2;

const RadarChart = function RadarChart(parent_selector, data, options) {
    //Wraps SVG text - Taken from http://bl.ocks.org/mbostock/7555321
    const wrap = (text, width) => {
      text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.4, // ems
                y = text.attr("y"),
                x = text.attr("x"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
              }
            }
      });
    }//wrap

    const cfg = {
        w: 600,                 //Width of the circle
        scaleW: null,           //Size in which chart should be displayed, null == w + margins
        h: 600,                 //Height of the circle
        scaleH: null,           //Size in which chart should be displayed, null == h + margins
        margin: {top: 20, right: 20, bottom: 20, left: 20}, //The margins of the SVG
        levels: 3,              //How many levels or inner circles should there be drawn
        maxValue: 0,            //What is the value that the biggest circle will represent
        minValue: 0,            //What is the value that the smallest circle will represent
        labelFactor: 1.4,       //How much farther than the radius of the outer circle should the labels be placed
        wrapWidth: 60,          //The number of pixels after which a label needs to be given a new line
        opacityArea: 0.35,      //The opacity of the area of the blob
        dotRadius: 4,           //The size of the colored circles of each blog
        opacityCircles: 0.1,    //The opacity of the circles of each blob
        strokeWidth: 2,         //The width of the stroke around each blob
        roundStrokes: false,    //If true the area and stroke will follow a round path (cardinal-closed)
        color: d3.scaleOrdinal(d3.schemeCategory10), //Color function,
        format: '.2%',
        unit: '',
        legend: false
    };

    //Put all of the options into a variable called cfg
    if('undefined' !== typeof options){
      for(var i in options){
        if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
      }//for i
    }//if

    let domains = [];
    if (data.every((elem) => elem.axes.every((axis) => "domain" in axis))) {
        for(let dp in data) {
            for(let i = 0; i < data[dp].axes.length; i++) {
                domains[i] = domains[i] || []
                domains[i][0] = Math.min(domains[i][0] || 10e10, data[dp].axes[i].domain[0])
                domains[i][1] = Math.max(domains[i][1] || 0, data[dp].axes[i].domain[1])
            }
        }
    }
    const countDomains = (new Set(domains)).size
    if(countDomains == 0) {
        //If the supplied maxValue is smaller than the actual one, replace by the max in the data
        // var maxValue = max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));
        let maxValue = 0;
        let minValue = 0;
        for (let j = 0; j < data.length; j++) {
            for (let i = 0; i < data[j].axes.length; i++) {
                // data[j].axes[i]['id'] = data[j].name;
                if (data[j].axes[i]['value'] > maxValue) {
                    maxValue = data[j].axes[i]['value'];
                }
                if (data[j].axes[i]['value'] < minValue) {
                    minValue = data[j].axes[i]['value'];
                }
            }
        }
        maxValue = max(cfg.maxValue, maxValue);
        minValue = max(cfg.minValue, minValue);
        for(let i = 0; i < data[0].axes.length; i++) {
            domains[i] = [];
            domains[i][0] = minValue;
            domains[i][1] = maxValue;
        }
    }


    const allAxis = data[0].axes.map((i, j, m) => i.axis),	//Names of each axis
        total = allAxis.length,					//The number of different axes
        radius = Math.min(cfg.w/2, cfg.h/2), 	//Radius of the outermost circle
        Format = d3.format(cfg.format),			 	//Formatting
        Format0 = d3.format(".0" + cfg.format.slice(-1)),
        FormatConditional = (d) => (d % 1 == 0) ? Format0(d) : Format(d),
        angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"

    //Scale for the radius
    const rScale = d3.scaleLinear()
        .range([0, radius])
        .domain([0, 1]);

    let scales = []
    for(let i = 0; i < domains.length; i++) {
        scales[i] = d3.scaleLinear()
        .range([0, radius])
        .domain(domains[i]);
    }

    /////////////////////////////////////////////////////////
    //////////// Create the container SVG and g /////////////
    /////////////////////////////////////////////////////////
    const parent = d3.select(parent_selector);

    //Remove whatever chart with the same id/class was present before
    parent.select("svg").remove();

    //Initiate the radar chart SVG
    let svg = parent.append("svg")
            .attr("width", cfg.scaleW == null ? cfg.w + cfg.margin.left + cfg.margin.right : cfg.scaleW)
            .attr("height", cfg.scaleH == null ? cfg.h + cfg.margin.top + cfg.margin.bottom : cfg.scaleH)
            .attr("class", "radar")
            .attr("viewBox", "0 0 " + (cfg.w + cfg.margin.left + cfg.margin.right) + " " + (cfg.h + cfg.margin.top + cfg.margin.bottom));

    //Append a g element
    let g = svg.append("g")
            .attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");

    /////////////////////////////////////////////////////////
    ////////// Glow filter for some extra pizzazz ///////////
    /////////////////////////////////////////////////////////

    //Filter for the outside glow
    let filter = g.append('defs').append('filter').attr('id','glow'),
        feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
        feMerge = filter.append('feMerge'),
        feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
        feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

    /////////////////////////////////////////////////////////
    /////////////// Draw the Circular grid //////////////////
    /////////////////////////////////////////////////////////

    //Wrapper for the grid & axes
    let axisGrid = g.append("g").attr("class", "axisWrapper");

    //Draw the background circles
    axisGrid.selectAll(".levels")
        .data(d3.range(1,(cfg.levels+1)).reverse())
        .enter()
        .append("circle")
        .attr("class", "gridCircle")
        .attr("r", d => radius / cfg.levels * d)
        .style("fill", "#CDCDCD")
        .style("stroke", "#CDCDCD")
        .style("fill-opacity", cfg.opacityCircles)
        .style("filter" , "url(#glow)");

    // //Text indicating at what % each level is
    // axisGrid.selectAll(".axisLabel")
    //    .data(d3.range(1,(cfg.levels+1)).reverse())
    //    .enter().append("text")
    //    .attr("class", "axisLabel")
    //    .attr("x", 4)
    //    .attr("y", d => -d * radius / cfg.levels)
    //    .attr("dy", "0.4em")
    //    .style("font-size", "10px")
    //    .attr("fill", "#737373")
    //    .text(d => Format(maxValue * d / cfg.levels) + cfg.unit);

    /////////////////////////////////////////////////////////
    //////////////////// Draw the axes //////////////////////
    /////////////////////////////////////////////////////////

    //Create the straight lines radiating outward from the center
    var axis = axisGrid.selectAll(".axis")
        .data(allAxis)
        .join("g")
        .attr("class", "axis");
    //Append the lines
    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(1.1) * cos(angleSlice * i - HALF_PI))
        .attr("y2", (d, i) => rScale(1.1) * sin(angleSlice * i - HALF_PI))
        .attr("class", "line")
        .style("stroke", "white")
        .style("stroke-width", "2px");

    //Append the labels at each axis
    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "17px")
        .style("font-family", "Raleway, Open Sans, sans-serif")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.35em")
        .attr("data-factor", function(d, i) { return Math.abs(cos(angleSlice * i - HALF_PI)) < 1e-10 ? 1.2 : cfg.labelFactor; })
        .attr("x", (d,i) => rScale(cfg.labelFactor) * cos(angleSlice * i - HALF_PI))
        .attr("y", function(d, i) { return rScale(d3.select(this).attr("data-factor")) * sin(angleSlice * i - HALF_PI); })
        .text(d => d)
        .call(wrap, cfg.wrapWidth);

    /////////////////////////////////////////////////////////
    ///////////// Draw the radar chart blobs ////////////////
    /////////////////////////////////////////////////////////

    //The radial line function
    const radarLine = d3.radialLine()
        .curve(d3.curveLinearClosed)
        .radius((d, i) => scales[i](d.value))
        .angle((d,i) => i * angleSlice);

    if(cfg.roundStrokes) {
        radarLine.curve(d3.curveCardinalClosed)
    }

    //Create a wrapper for the blobs
    const blobWrapper = g.selectAll(".radarWrapper")
        .data(data)
        .enter().append("g")
        .attr("class", "radarWrapper")
        .attr("i", (d, i) => i);

    //Append the backgrounds
    blobWrapper
        .append("path")
        .attr("class", "radarArea")
        .attr("d", d => radarLine(d.axes))
        .style("fill", (d,i) => cfg.color(i))
        .style("fill-opacity", cfg.opacityArea)
        .on('mouseover', function(d, i) {
            //Dim all blobs
            parent.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", 0.1);
            //Bring back the hovered over blob
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);
        })
        .on('mouseout', () => {
            //Bring back all blobs
            parent.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", cfg.opacityArea);
        });

    //Create the outlines
    blobWrapper.append("path")
        .attr("class", "radarStroke")
        .attr("d", function(d,i) { return radarLine(d.axes); })
        .style("stroke-width", cfg.strokeWidth + "px")
        .style("stroke", (d,i) => cfg.color(i))
        .style("fill", "none")
        .style("filter" , "url(#glow)");

    //Append the circles
    blobWrapper.selectAll(".radarCircle")
        .data(d => d.axes)
        .enter()
        .append("circle")
        .attr("class", "radarCircle")
        .attr("r", cfg.dotRadius)
        .attr("cx", (d,i) => scales[i](d.value) * cos(angleSlice * i - HALF_PI))
        .attr("cy", (d,i) => scales[i](d.value) * sin(angleSlice * i - HALF_PI))
        .style("fill", function(d) { return cfg.color(parseInt(d3.select(this.parentNode).attr("i"))); })
        .style("fill-opacity", 0.8);

    /////////////////////////////////////////////////////////
    //////// Append invisible circles for tooltip ///////////
    /////////////////////////////////////////////////////////

    //Wrapper for the invisible circles on top
    const blobCircleWrapper = g.selectAll(".radarCircleWrapper")
        .data(data)
        .enter().append("g")
        .attr("class", "radarCircleWrapper");

    //Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll(".radarInvisibleCircle")
        .data(d => d.axes)
        .enter().append("circle")
        .attr("class", "radarInvisibleCircle")
        .attr("r", cfg.dotRadius * 1.5)
        .attr("cx", (d,i) => scales[i](d.value) * cos(angleSlice*i - HALF_PI))
        .attr("cy", (d,i) => scales[i](d.value) * sin(angleSlice*i - HALF_PI))
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function(d,i) {
            tooltip
                .attr('x', this.cx.baseVal.value - 10)
                .attr('y', this.cy.baseVal.value - 10)
                .transition()
                .style('display', 'block')
                .text(FormatConditional(d.value) + cfg.unit);
        })
        .on("mouseout", function(){
            tooltip.transition()
                .style('display', 'none').text('');
        });

    const tooltip = g.append("text")
        .attr("class", "tooltip")
        .attr('x', 0)
        .attr('y', 0)
        .style("cursor", "default")
        .style("font-size", "20px")
        .style("font-family", "Raleway, Open Sans, sans-serif")
        .style('display', 'none')
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em");

    if (cfg.legend !== false && typeof cfg.legend === "object") {
        let legendZone = svg.append('g');
        let names = data.map(el => el.name);
        if (cfg.legend.title) {
            let title = legendZone.append("text")
                .attr("class", "title")
                .attr('transform', `translate(${cfg.legend.translateX},${cfg.legend.translateY})`)
                .attr("x", cfg.w - 70)
                .attr("y", 10)
                .attr("font-size", "16px")
                .style("font-family", "Raleway, Open Sans, sans-serif")
                .attr("fill", "#404040")
                .text(cfg.legend.title);
        }
        let legend = legendZone.append("g")
            .attr("class", "legend")
            .attr("height", 100)
            .attr("width", 200)
            .attr('transform', `translate(${cfg.legend.translateX},${cfg.legend.translateY + 20})`);
        // Create rectangles markers
        legend.selectAll('rect')
          .data(names)
          .enter()
          .append("rect")
          .attr("x", cfg.w - 65)
          .attr("y", (d,i) => i * 20)
          .attr("width", 10)
          .attr("height", 10)
          .style("fill", (d,i) => cfg.color(i));
        // Create labels
        legend.selectAll('text')
          .data(names)
          .enter()
          .append("text")
          .attr("x", cfg.w - 52)
          .attr("y", (d,i) => i * 20 + 9)
          .attr("font-size", "17px")
          .style("font-family", "Raleway, Open Sans, sans-serif")
          .attr("fill", "#737373")
          .text(d => d);
    }
    return svg;
}

const RadarChartEmpty = function RadarChartEmpty(parent_selector, allAxis, options) {
    //Wraps SVG text - Taken from http://bl.ocks.org/mbostock/7555321
    const wrap = (text, width) => {
      text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.4, // ems
                y = text.attr("y"),
                x = text.attr("x"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
              }
            }
      });
    }//wrap

    const cfg = {
        w: 600,                 //Width of the circle
        scaleW: null,           //Size in which chart should be displayed, null == w + margins
        h: 600,                 //Height of the circle
        scaleH: null,           //Size in which chart should be displayed, null == h + margins
        margin: {top: 20, right: 20, bottom: 20, left: 20}, //The margins of the SVG
        levels: 3,              //How many levels or inner circles should there be drawn
        maxValue: 0,            //What is the value that the biggest circle will represent
        labelFactor: 1.4,       //How much farther than the radius of the outer circle should the labels be placed
        wrapWidth: 60,          //The number of pixels after which a label needs to be given a new line
        opacityArea: 0.35,      //The opacity of the area of the blob
        dotRadius: 4,           //The size of the colored circles of each blog
        opacityCircles: 0.1,    //The opacity of the circles of each blob
        strokeWidth: 2,         //The width of the stroke around each blob
        roundStrokes: false,    //If true the area and stroke will follow a round path (cardinal-closed)
        color: d3.scaleOrdinal(d3.schemeCategory10), //Color function,
        format: '.2%',
        unit: '',
        legend: false
    };

    //Put all of the options into a variable called cfg
    if('undefined' !== typeof options){
      for(var i in options){
        if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
      }//for i
    }//if


    const total = allAxis.length,               //The number of different axes
        radius = Math.min(cfg.w/2, cfg.h/2),    //Radius of the outermost circle
        Format = d3.format(cfg.format),         //Formatting
        Format0 = d3.format(".0" + cfg.format.slice(-1)),
        FormatConditional = (d) => (d % 1 == 0) ? Format0(d) : Format(d),
        angleSlice = Math.PI * 2 / total;       //The width in radians of each "slice"

    //Scale for the radius
    const rScale = d3.scaleLinear()
        .range([0, radius])
        .domain([0, 1]);

    /////////////////////////////////////////////////////////
    //////////// Create the container SVG and g /////////////
    /////////////////////////////////////////////////////////
    const parent = d3.select(parent_selector);

    //Remove whatever chart with the same id/class was present before
    parent.select("svg").remove();

    //Initiate the radar chart SVG
    let svg = parent.append("svg")
            .attr("width", cfg.scaleW == null ? cfg.w + cfg.margin.left + cfg.margin.right : cfg.scaleW)
            .attr("height", cfg.scaleH == null ? cfg.h + cfg.margin.top + cfg.margin.bottom : cfg.scaleH)
            .attr("class", "radar")
            .attr("viewBox", "0 0 " + (cfg.w + cfg.margin.left + cfg.margin.right) + " " + (cfg.h + cfg.margin.top + cfg.margin.bottom));

    //Append a g element
    let g = svg.append("g")
            .attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");

    /////////////////////////////////////////////////////////
    ////////// Glow filter for some extra pizzazz ///////////
    /////////////////////////////////////////////////////////

    //Filter for the outside glow
    let filter = g.append('defs').append('filter').attr('id','glow'),
        feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
        feMerge = filter.append('feMerge'),
        feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
                feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

    /////////////////////////////////////////////////////////
    /////////////// Draw the Circular grid //////////////////
    /////////////////////////////////////////////////////////

    //Wrapper for the grid & axes
    let axisGrid = g.append("g").attr("class", "axisWrapper");

    //Draw the background circles
    axisGrid.selectAll(".levels")
        .data(d3.range(1,(cfg.levels+1)).reverse())
        .enter()
        .append("circle")
        .attr("class", "gridCircle")
        .attr("r", d => radius / cfg.levels * d)
        .style("fill", "#CDCDCD")
        .style("stroke", "#CDCDCD")
        .style("fill-opacity", cfg.opacityCircles)
        .style("filter" , "url(#glow)");

    /////////////////////////////////////////////////////////
    //////////////////// Draw the axes //////////////////////
    /////////////////////////////////////////////////////////

    //Create the straight lines radiating outward from the center
    var axis = axisGrid.selectAll(".axis")
        .data(allAxis)
        .join("g")
        .attr("class", "axis");
    //Append the lines
    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(1.1) * cos(angleSlice * i - HALF_PI))
        .attr("y2", (d, i) => rScale(1.1) * sin(angleSlice * i - HALF_PI))
        .attr("class", "line")
        .style("stroke", "white")
        .style("stroke-width", "2px");

    //Append the labels at each axis
    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "17px")
        .style("font-family", "Raleway, Open Sans, sans-serif")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.35em")
        .attr("data-factor", function(d, i) { return Math.abs(cos(angleSlice * i - HALF_PI)) < 1e-10 ? 1.2 : cfg.labelFactor; })
        .attr("x", (d,i) => rScale(cfg.labelFactor) * cos(angleSlice * i - HALF_PI))
        .attr("y", function(d, i) { return rScale(d3.select(this).attr("data-factor")) * sin(angleSlice * i - HALF_PI); })
        .text(d => d)
        .call(wrap, cfg.wrapWidth);

    return svg;
}