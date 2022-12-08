// sources and inspirations:
// https://d3-graph-gallery.com/graph/scatter_basic.html
// http://bl.ocks.org/mthh/7e17b680b35b83b49f1c22a3613bd89f
// https://www.d3indepth.com/scales/
// https://gramener.github.io/d3js-playbook/events.html
// https://chartio.com/resources/tutorials/how-to-resize-an-svg-when-the-window-is-resized-in-d3-js/

var d3; // Minor workaround to avoid error messages in editors

// map to store all selected circles
const mapRadar = new Map()

// Waiting until document has loaded
window.onload = () => {

    //#region helperFunctions

    // function to format number to include comma every 3 digits
    function numberWithCommas(x) { return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

    // conversion from miles per gallon to liters per 100 kilometers
    function mpg2lp100km(x) { return 235.215 / x; }

    // conversion between pounds and kilograms
    function lbs2kg(x) { return Math.round(x / 2.205); }

    // conversion between inches and centimeters
    function in2cm(x) { return Math.round(x * 2.54); }

    // clamp value between minimum and maximum
    function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
    //#endregion

    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 300, bottom: 30, left: 60},
            width = 1250 - margin.left - margin.right,
            height = 750 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3.select("#scatterplot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    //Read the data
    d3.csv("Assets/cars.csv").then(function(data) {
        for(let i = 0; i < data.length; i++) {
            data[i].id = i;
        }

        //#region data dimensions
        // Add X axis
        const maxHP = d3.max(data, function(d) { return +d["Horsepower(HP)"]; });
        const x = d3.scaleLinear()
            .domain([50, maxHP])
            .range([0, width])
            .nice();
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));
        svg.append("text")
            .attr("transform", "translate(920, " + (height + 3) + ")")
            .style("font-family", "Raleway, Open Sans, sans-serif")
            .text("Horsepower (HP)")

        // Add Y axis
        const maxRetail = d3.max(data, function(d) { return +d["Retail Price"]; });
        const y = d3.scaleSqrt()
            .domain([9000, maxRetail])
            .range([ height, 0])
        svg.append("g")
            .call(d3.axisLeft(y));
        svg.append("text")
            .attr("transform", "translate(20, 20)")
            .style("font-family", "Raleway, Open Sans, sans-serif")
            .text("Retail Price ($)")

        // add size
        const maxSize = lbs2kg(d3.max(data, function(d) { return +d["Weight"]; }));
        const minSize = lbs2kg(d3.min(data, function(d) { return +d["Weight"]; }));
        const size = d3.scaleLinear()
            .domain([minSize, maxSize])
            .range([1.5, 8])

        // add color
        const color = d3.scaleOrdinal()
            .domain(["Sedan", "SUV", "Sports Car", "Wagon", "Minivan"])
            .range(["#5eff36", "#ff5436", "#f534eb", "#ffc953", "#9253ff"])
        //#endregion

        // Add dots, add four data dimensions
        svg.append('g')
            .selectAll("dot")
            .data(data)
            .join("circle")
            .attr("id", function(d) { return "dot-"+d.id; })
            .attr("cx", function (d) { return x(d["Horsepower(HP)"]); } )
            .attr("cy", function (d) { return y(d["Retail Price"]); } )
            .attr("r", function(d) { return size(lbs2kg(d["Weight"])); })
            .attr("fill", function(d) { return color(d["Type"]); })
            .attr("fill-opacity", 0.6)
            .attr("stroke", "#000000")
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.6)
            .style("cursor", "pointer")

        // Add hover tooltip and click to show in radarChart eventListeners
        svg.selectAll("circle")
            .on("mouseover",(d, id) => {    // event listener to show tooltip on hover
                d3.select("#bubble-tip-"+d.id)
                    .style("display","block");
            })
            .on("mouseout", (d, id) => {    // event listener to hide tooltip after hover
                d3.select("#bubble-tip-"+d.id)
                    .style("display","none");
            })
            .on("click", function(d) {    // event listener to make tooltip remain visible on click
                if(!mapRadar.has(d.id)){
                    d3.select(this)
                        .attr("fill-opacity", 1)
                        .attr("stroke-opacity", 1)
                        .attr("stroke", "rebeccapurple")
                        .attr("stroke-width", 5)
                    mapRadar.set(d.id, {
                        name: d["Name"],
                        axes:[
                            {axis: "Retail Price", value: d["Retail Price"], domain: [0, maxRetail]},
                            {axis: "Engine Size (l)", value: d["Engine Size (l)"], domain: [0, d3.max(data, (d)=>d["Engine Size (l)"])]},
                            {axis: "Horsepower", value: d["Horsepower(HP)"], domain: [0, maxHP]},
                            {axis: "Weight (kg)", value: lbs2kg(d["Weight"]), domain: [minSize/2, maxSize]},
                            {axis: "Length (cm)", value: in2cm(d["Len"]), domain: [in2cm(d3.min(data, (d)=>d["Len"])), in2cm(d3.max(data, (d)=>d["Len"]))]},
                            {axis: "City l/100km", value: mpg2lp100km(d["City Miles Per Gallon"]), domain: [0, d3.max(data, (d)=>mpg2lp100km(d["City Miles Per Gallon"]))]}
                        ],
                        type: d["Type"],
                        id: d.id
                    })
                    drawRadar(svg, margin.left)
                } else{
                    d3.select(this)
                        .attr("fill-opacity", 0.6)
                        .attr("stroke-opacity", 0.6)
                        .attr("stroke", "#000000")
                        .attr("stroke-width", 1)
                    mapRadar.delete(d.id)
                    drawRadar(svg, margin.left)
                }
            });

        //#region legend
        // add legend to top right corner
        svg.append("g")
            .attr("id", "legend")
            .attr("transform", "translate(" + (990 - margin.left) + ", 0)")
            .append("rect")
            .attr("fill", "lightgray")
            .attr("fill-opacity", 0.9)
            .attr("width", "260")
            .attr("height", "190")
            .attr("rx", 5)

        svg.select("#legend")
            .append("text")
            .text("Size: Weight")
            .attr("x", 10)
            .attr("y", 25)
            .style("font-family", "Raleway, Open Sans, sans-serif")
            .style("font-size", "15px")

        // add circles to indicate size scale
        for(let i = 0; i < 2; i++) {
            for(let j = 0; j < 2; j++) {
                svg.select("#legend")
                    .append("circle")
                    .attr("r", size(minSize + (maxSize - minSize) * ((i*2+j) / 3)))
                    .attr("cx", 20 + j * 125)
                    .attr("cy", 45 + i * 25)
                    .attr("fill", "none")
                    .attr("stroke", "#000")
                    .attr("stroke-width", "1")

                svg.select("#legend")
                    .append("text")
                    .text(parseFloat((minSize + (maxSize - minSize) * ((i*2+j) / 3)).toPrecision(2)) + " kg")
                    .attr("x", 35 + j * 125)
                    .attr("y", 50 + i * 25)
                    .style("font-family", "Raleway, Open Sans, sans-serif")
                    .style("font-size", "15px")
            }
        }

        svg.select("#legend")
            .append("text")
            .text("Color: Car Type")
            .attr("x", 10)
            .attr("y", 100)
            .style("font-family", "Raleway, Open Sans, sans-serif")
            .style("font-size", "15px")

        // add colors to show type
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < (i==2?1:2); j++) {
                svg.select("#legend")
                    .append("circle")
                    .attr("r", 6)
                    .attr("cx", 20 + j * 125)
                    .attr("cy", 120 + i * 25)
                    .attr("fill", color(color.domain()[(i*2+j)]))
                    .attr("fill-opacity", 0.6)
                    .attr("stroke", "#000")
                    .attr("stroke-width", "1")

                svg.select("#legend")
                    .append("text")
                    .text(color.domain()[(i*2+j)])
                    .attr("x", 35 + j * 125)
                    .attr("y", 125 + i * 25)
                    .style("font-family", "Raleway, Open Sans, sans-serif")
                    .style("font-size", "15px")
            }
        }
        //#endregion

        //#region tooltip
        // add tooltips, one for each circle in scatterplot
        svg.append("g")
            .selectAll(".bubble-tip")
            .data(data)
            .join("g")
            .attr("class", "bubble-tip")
            .attr("id", (d)=> "bubble-tip-"+d.id)
            .attr("transform", (d) => "translate("+(x(d["Horsepower(HP)"])+16)+", "+clamp(y(d["Retail Price"])+24, 0, 620)+")")
            .style("display", "none")
            .append("rect")     // this is the background to the tooltip
            .attr("x",-7)
            .attr("y",-20)
            .attr("rx",5)
            .attr("fill","lightgray")
            .attr("fill-opacity", 0.9)
            .attr("height", 120)

        svg.selectAll(".bubble-tip")
            .append("text")
            .text(d => "Name: " + d["Name"])
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")

        // make width dependent on length of name, seems to not work on firefox
        svg.selectAll(".bubble-tip")
            .select("rect")
            .attr("width", d => {
                return Math.max(svg.select("#bubble-tip-" + d.id)
                    .select("text")
                    .node()
                    .getComputedTextLength() + 20,
                    150); 
            });

        svg.selectAll(".bubble-tip")
            .append("text")
            .text(d => "Type: " + d["Type"])
            .attr("y", 18)
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")

        svg.selectAll(".bubble-tip")
            .append("text")
            .text(d => "Retail Price: $ " + numberWithCommas(d["Retail Price"]))
            .attr("y", 36)
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")

        svg.selectAll(".bubble-tip")
            .append("text")
            .text(d => "Engine Size (l): " + d["Engine Size (l)"])
            .attr("y", 54)
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")

        svg.selectAll(".bubble-tip")
            .append("text")
            .text(d => "Horsepower: " + d["Horsepower(HP)"])
            .attr("y", 72)
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")

        svg.selectAll(".bubble-tip")
            .append("text")
            .text(d => "Weight: " + lbs2kg(d["Weight"]))
            .attr("y", 90)
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")
        //#endregion

        // draw initially empty radarChart
        drawRadar(svg, margin.left)
    })

};

// use radarChart function, supply options, add legend for all shown cars
function drawRadar(svg, marginLeft) {
    const radarMargin = { top: 50, right: 80, bottom: 50, left: 80 }
    const radarChartOptions = {
        w: 290,
        h: 350,
        scaleW: 250,
        scaleH: 250,
        margin: radarMargin,
        levels: 5,
        roundStrokes: true,
        format: '.1f'
    };

    let data = Array.from(mapRadar.values())
    console.log(data)

    // remove previous chart
    svg.select(".radarLegend").remove()

    if(data.length == 0) {
        // if no cars selected, draw empty plot, supple only axis names instead of data
        RadarChartEmpty("#radarChart", ["Retail Price", "Engine Size (l)", "Horsepower", "Weight (kg)", "Length (cm)", "City l/100km"], radarChartOptions)
    } else {
        // draw regular chart if cars are selected
        RadarChart("#radarChart", data, radarChartOptions)

        //#region radar Legend

        // add legend underneath radarChart to show the selected cars
        let radarLegend = svg.append("g")
            .attr("class", "radarLegend")
            .attr("transform", "translate(" + (990 - marginLeft) + ", 435)")

        radarLegend.append("rect")
            .attr("fill", "lightgray")
            .attr("fill-opacity", 0.9)
            .attr("width", "260")
            .attr("height", 12 + data.length * 20)
            .attr("rx", 5)

        let color = d3.scaleOrdinal(d3.schemeCategory10)

        for(let i = 0; i < data.length; i++) {
            // add circle to show color of car in redarChart
            radarLegend.append("circle")
                .attr("r", 6)
                .attr("cx", 15)
                .attr("cy", 16 + i * 20)
                .attr("fill", color(i))
                .attr("fill-opacity", 0.6)
                .attr("stroke", "#000")
                .attr("stroke-width", "1")
                .style("cursor", "pointer")

            // add X to make deselecting a car easier
            radarLegend.append("text")
                .attr("x", 11)
                .attr("y", 20 + i * 20)
                .text("x")
                .style("font-family", "sans-serif")
                .style("cursor", "pointer")
                .on("click", function(d) {
                    d3.select("#dot-"+data[i].id)
                        .attr("fill-opacity", 0.6)
                        .attr("stroke-opacity", 0.6)
                        .attr("stroke", "#000000")
                        .attr("stroke-width", 1)
                    mapRadar.delete(data[i].id)
                    drawRadar(svg, marginLeft)
                })

            // add name of car
            radarLegend.append("text")
                .text(data[i].name)
                .attr("x", 30)
                .attr("y", 20 + i * 20)
                .style("font-family", "Raleway, Open Sans, sans-serif")
                .style("font-size", "12px")
        }
        //#endregion
    }
}