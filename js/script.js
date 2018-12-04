var data_folder = ['data/']
//var data_folder = ['data/us_canada_humanities_2017/']
var files = {
        vectors: 'snippet_vectors100.tsv',
        metadata: 'snippets_metadata-1.tsv'
};

var data = {
};

var gui_elements = {

};

var width, height;
var xValues = [];
var yValues = [];
var vectorIndices = [0, 1];

function load() {
    
    load_data(data_folder[0] + files.metadata, function(e, i) {
        
        if (typeof i === 'string') {
            set_metadata(i);
        } else {
            console.log('Unable to load a file ' + files.metadata)
        }
    });

    load_data(data_folder[0] + files.vectors, function(e, i) {
        
        if (typeof i === 'string') {
            set_vectors(i);
        } else {
            console.log('Unable to load a file ' + files.vectors)
        }
    });
};

function load_data(e, t) {
    var i, n;
    if (e === undefined) {
        return t('target undefined', undefined)
    }
    i = e.replace(/^.*\//, '');
    n = d3.select('#m__DATA__' + i.replace(/\..*$/, ''));
    if (!n.empty()) {
        return t(undefined, JSON.parse(n.html()))
    }
    if (e.search(/\.zip$/) > 0) {
        return d3.xhr(e).responseType('arraybuffer').get(function(e, n) {
            var o, r;
            if (n && n.status === 200 && n.response.byteLength) {
                o = new JSZip(n.response);
                r = o.file(i.replace(/\.zip$/, '')).asText()
            }
            return t(e, r)
        })
    }

    return d3.text(e).then(function(data) {
        return t(e, data)
    })
};


function set_metadata(text) {
    var rows = text.split(/\r?\n/);

    data = rows.map(function(t, i) {
        return {idx:i, text:t};
    });
}

function set_vectors(text) {
    var rows = d3.tsvParseRows(text);

    rows.map(function(v, i) { 
        data[i].vectors = v.slice(1, v.length);
    });
    
    init();
}

function setNormalZoom(svg) {
    zoom.scaleExtent([0.1, 3])
        .on('zoom', function() {
            var transform = d3.event.transform;
            svg.select('g').attr('transform', transform);
           
        });
    svg.call(zoom);
}

// function setSacledZoom(svg) {
//     var aspect = width / height;
//     var n = Math.floor(width / (2.1 * Math.sqrt(aspect * 100)));
//     var i = n * 1.8;
//     var o = 1.1 * n;

//     var xScale = d3.scaleLinear().domain([0, width]).range([o, width - o]);
//     var yScale = d3.scaleLinear().domain([height, 0]).range([height - o, o]);
//     var snippets = svg.selectAll('.snippet');

//     zoom.scaleExtent([1, 15])
//         .on('zoom', function() {
//             var transform = d3.event.transform;
//             var scaledX, scaledY;
            
//             snippets.transition().duration(1)
//                 .attr('transform', function(d) {
//                     scaledX = transform.applyX(xScale(d.x));
//                     scaledY = transform.applyY(yScale(d.y));

//                     return 'translate(' + [scaledX, scaledY] + ')';
//                 });
//         });

//     svg.call(zoom);
// }

function init() {
    
    var container = d3.select('.container').node();
    var header = d3.select('.header').node();
    container.style.height = (window.innerHeight - header.offsetHeight) + 'px';
    
    var ua = window.navigator.userAgent;
    isMSIE = (ua.indexOf('MSIE ') > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./));
    isFF = (ua.indexOf('Firefox') > 0);

    var svg = d3.select('svg');
    var svgClientNode = (isFF)? svg.node().parentNode : svg.node();
   
    var margin = {
          top: 50,
          right: 50,
          bottom: 50,
          left: 80
        };

    width = svgClientNode.clientWidth - margin.left - margin.right;
    height = svgClientNode.clientHeight - margin.top - margin.bottom;
    
    data.forEach(function(d) {
        xValues.push(d.vectors[vectorIndices[0]]);
        yValues.push(d.vectors[vectorIndices[1]]);
    });

    var xDomain = [d3.min(xValues, function(d) { return +d; }), d3.max(xValues, function(d) { return +d; })];
    var yDomain = [d3.min(yValues, function(d) { return +d; }), d3.max(yValues, function(d) { return +d; })];
    
    console.log(xDomain, yDomain);

    var scaleX = d3.scaleLinear()
                    .domain(xDomain)
                    .range([0, width]);

    var scaleY = d3.scaleLinear()
                    .domain(yDomain)
                    .range([height, 0]);

    var xAxis = d3.axisBottom(scaleX);
    var yAxis = d3.axisLeft(scaleY).tickPadding(20);

    data.forEach(function(d) {
        d.originX = scaleX(d.vectors[vectorIndices[0]]);
        d.originY = scaleY(d.vectors[vectorIndices[1]]);

        d.textbox = {created: false, hidden: false};
    });

    var chart = svg.append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    zoom = d3.zoom();
    setNormalZoom(svg);

    chart.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    chart.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        console.log(this);
        this.parentNode.appendChild(this);
      });
    };
    
    d3.selection.prototype.moveToBack = function() {  
        return this.each(function() { 
            var firstChild = this.parentNode.firstChild; 
            if (firstChild) { 
                this.parentNode.insertBefore(this, firstChild); 
            } 
        });
    };

    var snippets = chart.selectAll('.snippet')
                        .data(data)
                        .enter().append('g')
                        .attr('class', 'snippet');

    circle = snippets.append('circle')
        .attr('r', 3)
        .attr('cx', function(d) { return d.originX; })
        .attr('cy', function(d) { return d.originY; })
        .style('fill', d3.rgb(255, 0, 0, 0.7))
        .style('cursor', 'pointer')
        .on('click', function(d) {
            let currentGroup = d3.select(this.parentNode);

            if(d.textbox.created == false) {
                var textbox = currentGroup.append('g').classed('textbox', true);
                textbox.style('cursor', 'move');
                
                var textboxMargin = { 
                                        top: 15,
                                        bottom: 10,
                                        left: 10,
                                        right: 25
                                    };
                
                var text = textbox.append('text')
                    .attr('x', d.originX + textboxMargin.left)
                    .attr('y', d.originY)
                    .style('text-anchor', 'start')
                    .text(function() {
                        return d.text.trim();
                    }).call(wrap, 300);

                var bbox = text.node().getBBox();
                bbox.y = d.originY - bbox.height;
                text.selectAll('tspan').attr('y', bbox.y);

                d.textbox.bbox = bbox;
                d.textbox.bbox.x -= textboxMargin.left;
                d.textbox.bbox.y -= (textboxMargin.top + textboxMargin.bottom);
                d.textbox.bbox.width += textboxMargin.left + textboxMargin.right;
                d.textbox.bbox.height += textboxMargin.top + textboxMargin.bottom;

                textbox.append('rect')
                    .attr('x', d.textbox.bbox.x)
                    .attr('y', d.textbox.bbox.y)
                    .attr('width', d.textbox.bbox.width)
                    .attr('height', d.textbox.bbox.height)
                    .style('fill', d3.rgb(200, 200, 200, 0.5));

                textbox.append('line')
                    .style('stroke', 'black')
                    .attr('x1', d.originX)
                    .attr('y1', d.originY)
                    .attr('x2', d.textbox.bbox.x)
                    .attr('y2', d.textbox.bbox.y + d.textbox.bbox.height);

                var closeButton = textbox.append('g').on('click', function() {
                            d.textbox.hidden =  !d.textbox.hidden;
                            currentGroup.select('.textbox').classed('hidden', d.textbox.hidden);
                        });;
                let buttonRadius = 8;
                let crossOffset = buttonRadius * 0.5;
                let buttonCenterX = d.textbox.bbox.x + d.textbox.bbox.width - buttonRadius * 1.5;
                let buttonCenterY = d.textbox.bbox.y + buttonRadius * 1.5;

                closeButton.append('circle')
                        .classed('closeButton', true)
                        .attr('cx', buttonCenterX)
                        .attr('cy', buttonCenterY)
                        .attr('r', buttonRadius)
                        .style('fill', d3.rgb(0, 0, 0, 0.5))
                        .style('cursor', 'pointer');
                        
                var cross = closeButton.append('g');

                cross.style('cursor', 'pointer');

                cross.append('line')
                        .attr("x1", buttonCenterX - buttonRadius + crossOffset)
                        .attr("y1", buttonCenterY)
                        .attr("x2", buttonCenterX + buttonRadius - crossOffset)
                        .attr("y2", buttonCenterY);
                        
                cross.append('line')
                        .attr("x1", buttonCenterX)
                        .attr("y1", buttonCenterY - buttonRadius + crossOffset)
                        .attr("x2", buttonCenterX)
                        .attr("y2", buttonCenterY + buttonRadius  - crossOffset);

                cross.attr("transform", "rotate (45," + buttonCenterX + "," + buttonCenterY + ")");

                cross.style('stroke', 'white')
                    .style('stroke-width', 1.5);

                d.x = 0, d.y = 0;

                textbox.call(d3.drag()
                    .on('start', function() {
                        //d3.select(this).moveToFront();
                        d3.select(this).select('rect').classed('active', true);
                        d3.select(this).select('line').classed('active', true);
                    })
                    .on('drag', function() {
                        d.textbox.bbox.x += d3.event.dx;
                        d.textbox.bbox.y += d3.event.dy;

                        d3.select(this).attr("transform", "translate(" + (d.x = d3.event.x) + "," + (d.y = d3.event.y) + ")");
                        d3.select(this).select('line')
                                        .attr("transform", "translate(" + (-d.x) + "," + (-d.y) + ")")
                                        .attr("x2", d.textbox.bbox.x)
                                        .attr("y2", d.textbox.bbox.y + d.textbox.bbox.height);
                    })
                    .on('end', function() {
                        d3.select(this).select('rect').classed('active', false);
                        d3.select(this).select('line').classed('active', false);
                    }));

                d.textbox.created = true;
                d.textbox.hidden = false;

            } else if(d.textbox.hidden) {
                d.textbox.hidden =  !d.textbox.hidden;
                currentGroup.select('.textbox').classed('hidden', d.textbox.hidden);
            }
        });    
}   

//Text wrapping based on https://bl.ocks.org/mbostock/7555321
function wrap(text, width) {

    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}

function draw() {
    var svg = d3.select('svg');

    
}