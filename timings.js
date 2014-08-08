(function () {
    "use strict";

    var totalTime = 1;
    var rootTime = 1;
    var levelMod = 0;
    var timings = {};
    var root;

    window.addEventListener("load", function () {
        console.log("Loaded");

        parseTimings();

        rootTime = totalTime = timings.root.time;
        root = timings.root;

        var size = 600;
        var radius = size / 2;

        var vis = d3.select("#chart")
            .append("svg:svg")
            .attr("width", size)
            .attr("height", size)
            .append("svg:g")
            .attr("id", "container")
            .attr("transform", "translate(" + (size / 2) + ", " + (size / 2) + ")");

        var arc = d3.svg.arc()
            .startAngle(function (d) {
                var offset = 0;
                var current = d;
                while (current != null && current.parent != null && current.level - levelMod != 0) {
                    var index = current.parent.children.indexOf(current);
                    for (var i = 0; i < index; i++) {
                        offset += current.parent.children[i].time;
                    }
                    current = current.parent;
                }
                return (offset / totalTime) * Math.PI * 2;
            })
            .endAngle(function (d) {
                var offset = 0;
                var current = d;
                while (current != null && current.parent != null && current.level - levelMod != 0) {
                    var index = current.parent.children.indexOf(current);
                    for (var i = 0; i < index; i++) {
                        offset += current.parent.children[i].time;
                    }
                    current = current.parent;
                }
                offset += d.time;
                return (offset / totalTime) * Math.PI * 2;
            })
            .innerRadius(function (d) {
                return (d.level - levelMod) * 70;
            })
            .outerRadius(function (d) {
                return (d.level + 1 - levelMod) * 70;
            });

        var partition = d3.layout.partition()
            .size(Math.PI * 2, radius * radius)
            .value(function (d) {
                return d.time;
            });

        vis.append("svg:circle")
            .attr("r", 400)
            .style("opacity", 0);

        var path = vis.selectAll("path")
            .data(partition.nodes(timings.root)
                .filter(function (d) {
                    return (d.time / totalTime) > 0.00005;
                }))
            .enter()
            .append("svg:path")
            .attr("d", arc)
            .attr("fill-rule", "evenodd")
            .attr("fill", function (d) {
                return d.color;
            })
            .attr("stroke", "#000000")
            .style("opacity", 1)
            .on("mouseover", mouseOver)
            .on("click", function (node) {
                if (node == root) {
                    root = node.parent;
                    if (root == null) {
                        root = timings.root;
                    }
                    totalTime = root.time;
                    levelMod = root.level;
                    node = root;
                } else {
                    totalTime = node.time;
                    levelMod = node.level;
                    root = node;
                }
                d3.selectAll("path")
                    .style("display", "inline");
                d3.selectAll("path")
                    .filter(function (d) {
                        var current = d;
                        while (current != null && current.parent != null) {
                            if (current == node) {
                                return false;
                            }
                            current = current.parent;
                        }
                        return current != node;
                    })
                    .style("display", "none");
                d3.selectAll("path")
                    .transition()
                    .duration(50)
                    .attr("d", arc);

            });

        d3.select("#container").on("mouseleave", mouseLeave);

        var table = "<tr><td>Total Time</td><td> " + timings.root.full_time + "ns (" + Math.round(timings.root.full_time / 10000000) / 100 + "s)</td></tr>";
        table += "<tr><td>Ticks</td><td> " + timings.root.ticks + "</td></tr>";
        table += "<tr><td>TPS</td><td> " + Math.round(timings.root.ticks / timings.root.full_time * 100000000000) / 100 + "</td></tr>";
        d3.select("#base-info").html(table);
    });

    function mouseOver(d) {
        var allowed = [];
        var current = d;
        while (current != null) {
            allowed.push(current);
            current = current.parent;
        }

        d3.selectAll("path")
            .style("opacity", 0.3);

        d3.selectAll("path")
            .filter(function (d) {
                return allowed.indexOf(d) >= 0;
            })
            .style("opacity", 1.0);

        var path = document.getElementById("timing-path");

        path.innerHTML = "";
        for (var i = allowed.length - 1; i >= 0; i--) {
            var item = document.createElement("span");
            item.innerHTML = allowed[i].name;
            path.appendChild(item);
            if (i != 0) {
                var separator = document.createElement("span");
                separator.innerHTML = " > ";
                path.appendChild(separator);
            }
        }
        var time = document.createElement("span");
        time.innerHTML = " == " + (Math.round((d.time / 1000000) * 100) / 100) + "ms";
        if (d.node != null) {
            time.innerHTML += " / avg: " + (Math.round((d.node.avg / 1000000) * 100) / 100) + "ms";
        }
        path.appendChild(time);
    }

    function mouseLeave(d) {
        d3.selectAll("path")
            .style("opacity", 1.0);
        var path = document.getElementById("timing-path");
        path.innerHTML = "";
    }

    var sampleMatch = /Sample time (\d*) .*/;
    var timeMatch = /\s*(.*) Time: (\d*) Count: (\d*) Avg: (\d*) Violations: (\d*)/;
    var pluginMatch = /Plugin: (.*) Event: (.*)\((.*)\)/;
    var taskMatch = /Task: (.*) Runnable: (.*)/;

    function parseTimings() {
        var i;
        var data = document.getElementById("data");
        var text = data.innerHTML.split("\n");

        var parsedInfo = [];

        for (i = 0; i < text.length; i++) {
            var line = text[i];
            if (line == "Minecraft") continue;
            if (line[0] == '#') continue; // Comment
            if (line[0] == ' ') {
                if (timeMatch.test(line)) {
                    var results = timeMatch.exec(line);
                    parsedInfo.push({
                        name: results[1],
                        time: parseInt(location.search.indexOf("avg") == -1 ? results[2] : results[4]),
                        count: results[3],
                        avg: results[4],
                        vio: results[5]
                    });
                }
            } else {
//                if (sampleMatch.test(line)) {
//                    totalTime = parseInt(sampleMatch.exec(line)[1]);
//                }
            }
        }

        timings.root = {
            name: "Root",
            level: 0,
            time: 0,
            parent: null,
            children: [],
            plugins: {},
            color: "#FFFFFF",
            ticks: NaN,
            full_time: NaN
        };
        
        var full_server_tick = null;

        for (i = 0; i < parsedInfo.length; i++) {
            var info = parsedInfo[i];
            if (info.name == "** Full Server Tick") full_server_tick = info;
            if (info.name.indexOf("**") == 0) continue;

            timings.root.time += info.time;

            var plugin;
            var name;
            var event;
            var res;
            if (info.name.indexOf("Plugin: ") == 0) {
                res = pluginMatch.exec(info.name);
                plugin = res[1];
                name = res[2];
                event = res[3];
            } else if (info.name.indexOf("Task: ") == 0) {
                res = taskMatch.exec(info.name);
                plugin = res[1];
                name = res[2];
                event = "task";
            } else {
                plugin = "Minecraft";
                name = info.name;
                event = "main";
            }
            if (!(plugin in timings.root.plugins)) {
                var p = timings.root.plugins[plugin] = {
                    name: plugin,
                    level: 1,
                    time: 0,
                    parent: timings.root,
                    children: [],
                    events: {}

                };
                timings.root.children.push(p);
            }
            var pl = timings.root.plugins[plugin];
            pl.time += info.time;

            if (!(event in pl.events)) {
                var e = pl.events[event] = {
                    name: event,
                    level: 2,
                    time: 0,
                    parent: pl,
                    children: [],
                    names: {}
                };
                pl.children.push(e);
            }
            var ev = pl.events[event];
            ev.time += info.time;

            if (!(name in ev.names)) {
                var n = ev.names[name] = {
                    name: name,
                    level: 3,
                    time: 0,
                    parent: ev,
                    children: [],
                    events: {}
                };
                ev.children.push(n);
            }
            var na = ev.names[name];
            na.time += info.time;
            na.node = info;
        }

        if (full_server_tick) {
            timings.root.ticks = full_server_tick.count;
            timings.root.full_time = full_server_tick.time;
        }

        // Colorise
        for (i = 0; i < timings.root.children.length; i++) {
            var pl = timings.root.children[i];
            var h = (((i / timings.root.children.length) * 360) | 0);
            pl.color = "hsl(" + h
                + ", 100%,"
                + "20%)";
            for (var j = 0; j < pl.children.length; j++) {
                var ev = pl.children[j];
                ev.color = "hsl(" + h
                    + ", 100%,"
                    + "40%)";
                for (var k = 0; k < ev.children.length; k++) {
                    var na = ev.children[k];
                    na.color = "hsl(" + h
                        + ", 100%,"
                        + "60%)";
                }
            }
        }
    }
})();
