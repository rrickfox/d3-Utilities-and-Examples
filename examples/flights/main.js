// sources and inspirations:
// https://bl.ocks.org/heybignick/3faf257bbbbc7743bb72310d03b86ee8
// https://observablehq.com/@d3/force-directed-graph
// https://observablehq.com/@d3/force-directed-graph-canvas?collection=@d3/d3-force
// https://github.com/d3/d3-force
// https://gist.github.com/PrajitR/0afccfa4dc4febe59276
// https://www.d3indepth.com/geographic/
// https://observablehq.com/@d3/u-s-map
// https://github.com/johan/world.geo.json/tree/master/countries/USA

var d3; // Minor workaround to avoid error messages in editors
let map_active = true;
let svg_map
let svg_force
let all_airports = []
const colors = ["#B8B214","#E61988","#1921E6","#19E677"]

// Waiting until document has loaded
window.onload = () => {
    // clamp value between minimum and maximum
    function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }

    // swap between map and force graph
    d3.select("#swap")
    .on("click", function() {
        if(map_active) {
            d3.select("#force-graph").style("display", "block");
            d3.select("#map").style("display", "none");
            map_active = false;
        } else {
            d3.select("#force-graph").style("display", "none");
            d3.select("#map").style("display", "block");
            map_active = true;
        }
    });

    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 60, bottom: 10, left: 60},
            width = 1050 - margin.left - margin.right,
            height = 1000 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    svg_map = d3.select("#map")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
    let geoGenerator = d3.geoPath().projection(projection);

    d3.csv("Assets/airports.csv").then(function(data) {
        // add state lines first so everything else will be drawn on top
        d3.json("us_states.min.json").then(function(data_states) {
            svg_map.append("g")
                .attr("id", "states")
                .attr("stroke", "black")
                .selectAll("path")
                .data(data_states.features)
                .join("path")
                .attr("fill", "none")
                .attr("d", geoGenerator)
                .attr("id", function(d) { return d["id"]; })

            for(item of data) {
                all_airports.push({"id": item["iata"], "state": item["state"], "name": item["name"]})
            }
            // console.log(all_airports)

            let color = d3.scaleOrdinal(colors)

            const x = function(d) { return projection([d["longitude"], d["latitude"]])[0]; }
            const y = function(d) { return projection([d["longitude"], d["latitude"]])[1]; }

            svg_map.append("g")
                .attr("class", "circles")
                .selectAll("dot")
                .data(data)
                .join("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 2)
                .attr("fill", function(d) { return color(coloring[d["state"]]); })
            
            svg_map.selectAll("circle")
                .on("mouseover",(d, id) => {    // event listener to show tooltip on hover
                    svg_map.select("#bubble-tip-"+d["iata"])
                        .style("display","block");
                })
                .on("mouseout", (d, id) => {    // event listener to hide tooltip after hover
                    svg_map.select("#bubble-tip-"+d["iata"])
                        .style("display","none");
                })

            svg_map.append("g")
                .attr("class", "tooltips")
                .selectAll(".bubble-tip")
                .data(data)
                .join("g")
                .attr("class", "bubble-tip")
                .attr("id", (d)=> "bubble-tip-"+d["iata"])
                .style("display", "none")
                .append("rect")     // this is the background to the tooltip
                .attr("x",-7)
                .attr("y",-20)
                .attr("rx",5)
                .attr("fill","lightgray")
                .attr("fill-opacity", 0.95)
                .attr("height", 47)

            svg_map.selectAll(".bubble-tip")
                .append("text")
                .text(d => "Name: " + d["name"])
                .style("font-family", "sans-serif")
                .style("font-size", 14)
                .attr("stroke", "none")

            svg_map.selectAll(".bubble-tip")
                .attr("transform", function(d) {
                    let width_tooltip = svg_map.select("#bubble-tip-" + d["iata"])
                    .select("text")
                    .node()
                    .getComputedTextLength() + 20; 
                    return "translate("+clamp(x(d)+16, 0, width-width_tooltip+25)+", "+clamp(y(d)+24, 0, 600)+")"
                })
                .select("rect")
                .attr("width", (d) => {
                    return svg_map.select("#bubble-tip-" + d["iata"])
                        .select("text")
                        .node()
                        .getComputedTextLength() + 20; 
                });

            svg_map.selectAll(".bubble-tip")
            .append("text")
            .text(d => "State: " + stateNames[d["state"]])
            .attr("y", 18)
            .style("font-family", "sans-serif")
            .style("font-size", 14)
            .attr("stroke", "none")


            d3.csv("Assets/flights-airport-5000plus.csv").then(function(data_flights) {
                let airports_with_data = new Set()
                let flights_only_once = new Map()
                let count_flights = new Map()
                for(item of data_flights) {
                    airports_with_data.add(item["origin"])
                    airports_with_data.add(item["destination"])

                    const reverse = [item["destination"], item["origin"]].join("-")
                    if(flights_only_once.has(reverse)) {
                        flights_only_once.set(reverse, flights_only_once.get(reverse) + parseInt(item["value"]))
                    } else {
                        flights_only_once.set([item["origin"], item["destination"]].join("-"), parseInt(item["value"]))
                    }

                    if(count_flights.has(item["origin"])) {
                        count_flights.set(item["origin"], count_flights.get(item["origin"]) + parseInt(item["value"]))
                    } else {
                        count_flights.set(item["origin"], parseInt(item["value"]))
                    }
                    if(count_flights.has(item["destination"])) {
                        count_flights.set(item["destination"], count_flights.get(item["destination"]) + parseInt(item["value"]))
                    } else {
                        count_flights.set(item["destination"], parseInt(item["value"]))
                    }
                }
                let data_flights_once = []
                for([key, value] of flights_only_once.entries()) {
                    key = key.split("-")
                    data_flights_once.push({"origin": key[0], "destination": key[1], "value": value})
                }
                // console.log(data_flights_once)
                let nodes = all_airports.filter(x => airports_with_data.has(x["id"])).map(x => ({"id": x["id"], "state": x["state"], "name": x["name"], "value": count_flights.get(x["id"])}))

                let maxSize, minSize;
                [minSize, maxSize] = d3.extent(nodes, d => d["value"])
                const radius = d3.scaleSqrt().domain([minSize, maxSize]).range([5, 20])
                svg_force = ForceGraph({nodes: nodes, links: data_flights_once}, {
                    nodeId: d => d["id"],
                    nodeGroup: d => coloring[d["state"]],
                    nodeValue: d => d["value"],
                    linkSource: d => d["origin"],
                    linkTarget: d => d["destination"],
                    linkStrength: d => parseInt(d["value"]),
                    nodeTitle: d => ({"Name": d["name"], "State": stateNames[d["state"]], "Flights": d["value"]}),
                    nodeRadius: d => radius(d.value),
                    colors: colors,
                    width: 1500,
                    height: height})

                // console.log(svg_force)
                d3.select("#force-graph").append(() => svg_force)

                // add legend to top right corner
                d3.select("#force-graph svg")
                    .append("g")
                    .attr("id", "legend")
                    .attr("transform", "translate(" + (990 - margin.left) + ", 0)")
                    .append("rect")
                    .attr("fill", "lightgray")
                    .attr("fill-opacity", 0.9)
                    .attr("width", "260")
                    .attr("height", "117")
                    .attr("rx", 5)

                d3.select("#legend")
                    .append("text")
                    .text("Size: Total Flights")
                    .attr("x", 10)
                    .attr("y", 25)
                    .style("font-family", "Raleway, Open Sans, sans-serif")
                    .style("font-size", "15px")

                // add circles to indicate size scale
                for(let i = 0; i < 2; i++) {
                    for(let j = 0; j < 2; j++) {
                        d3.select("#legend")
                            .append("circle")
                            .attr("r", radius(minSize + (maxSize - minSize) * ((i*2+j) / 3)))
                            .attr("cx", 30 + j * 125)
                            .attr("cy", 51 + i * 37)
                            .attr("fill", "none")
                            .attr("stroke", "#000")
                            .attr("stroke-width", "1")

                        d3.select("#legend")
                            .append("text")
                            .text(parseFloat((minSize + (maxSize - minSize) * ((i*2+j) / 3)).toPrecision(2)))
                            .attr("x", 60 + j * 125)
                            .attr("y", 55 + i * 37)
                            .style("font-family", "Raleway, Open Sans, sans-serif")
                            .style("font-size", "15px")
                    }
                }
            });
        })
    })

    const stateNames = {
        "AL": "Alabama",
        "AK": "Alaska",
        "AS": "American Samoa",
        "AZ": "Arizona",
        "AR": "Arkansas",
        "CA": "California",
        "CO": "Colorado",
        "CT": "Connecticut",
        "DE": "Delaware",
        "DC": "District Of Columbia",
        "FM": "Federated States Of Micronesia",
        "FL": "Florida",
        "GA": "Georgia",
        "GU": "Guam",
        "HI": "Hawaii",
        "ID": "Idaho",
        "IL": "Illinois",
        "IN": "Indiana",
        "IA": "Iowa",
        "KS": "Kansas",
        "KY": "Kentucky",
        "LA": "Louisiana",
        "ME": "Maine",
        "MH": "Marshall Islands",
        "MD": "Maryland",
        "MA": "Massachusetts",
        "MI": "Michigan",
        "MN": "Minnesota",
        "MS": "Mississippi",
        "MO": "Missouri",
        "MT": "Montana",
        "NE": "Nebraska",
        "NV": "Nevada",
        "NH": "New Hampshire",
        "NJ": "New Jersey",
        "NM": "New Mexico",
        "NY": "New York",
        "NC": "North Carolina",
        "ND": "North Dakota",
        "MP": "Northern Mariana Islands",
        "OH": "Ohio",
        "OK": "Oklahoma",
        "OR": "Oregon",
        "PW": "Palau",
        "PA": "Pennsylvania",
        "PR": "Puerto Rico",
        "RI": "Rhode Island",
        "SC": "South Carolina",
        "SD": "South Dakota",
        "TN": "Tennessee",
        "TX": "Texas",
        "UT": "Utah",
        "VT": "Vermont",
        "VI": "Virgin Islands",
        "VA": "Virginia",
        "WA": "Washington",
        "WV": "West Virginia",
        "WI": "Wisconsin",
        "WY": "Wyoming"
    }

    const coloring = {
        "WA": 0,
        "DE": 0,
        "DC": 0,
        "WI": 1,
        "WV": 0,
        "FL": 0,
        "WY": 2,
        "NH": 0,
        "NJ": 2,
        "NM": 2,
        "TX": 1,
        "LA": 0,
        "NC": 2,
        "ND": 2,
        "NE": 0,
        "TN": 0,
        "NY": 0,
        "PA": 1,
        "RI": 0,
        "NV": 1,
        "VA": 1,
        "CO": 1,
        "CA": 0,
        "AL": 2,
        "AR": 2,
        "VT": 1,
        "IL": 0,
        "GA": 1,
        "IN": 1,
        "IA": 2,
        "MA": 2,
        "AZ": 3,
        "ID": 3,
        "CT": 1,
        "ME": 1,
        "MD": 2,
        "OK": 0,
        "OH": 3,
        "UT": 0,
        "MO": 1,
        "MN": 0,
        "MI": 0,
        "KS": 2,
        "MT": 0,
        "MS": 1,
        "SC": 0,
        "KY": 2,
        "OR": 2,
        "SD": 1,
        "HI": 0,
        "AK": 0
      }
};
