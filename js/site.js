$('#viz').hide();

var config = {
    HXLProxyURL:'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1QA0UGOJtk5pJ-0oY2-V0iXs21SGS5Qz51Ns8i3QP1UA/edit%23gid%3D0',
    geomURL:'data/syria_adm2.json',
    topojson:'syria_adm2',
    color:'#D32F2F',
    mapcolors:['#DDDDDD','#E57373','#F44336','#D32F2F','#B71C1C'],
    mapboundaries:[5,10,20],
    joinattr:'PCODE',
    popupattr:'NAME_EN',
    title:'Hurricane Matthew Survey of Surveys',
    description:'Description Text',
    admlevel:'',
    weeks:true
}


function initDashboard(data,time,geom){

    var cf = crossfilter(data);

    var color = config.color;

    function reduceAdd(p, v) {
        v['#sector+list'].forEach (function(val, idx) {
            p[val] = (p[val] || 0) + 1; //increment counts
        });
        return p;
    }
    
    function reduceRemove(p, v) {
         v['#sector+list'].forEach (function(val, idx) {
            p[val] = (p[val] || 0) - 1; //decrement counts
        });
        return p;
    }
    
    function reduceInitial() {
           return {};  
    }

    var monthChart = dc.barChart('#monthChart');
    var sectorChart = dc.rowChart('#sectorChart');
    var mapChart = dc.leafletChoroplethChart('#mapChart');

    var surveys = dc.numberDisplay('#selected');

    var monthDimension = cf.dimension(function(d){return d['#date+week'];});
    var monthGroup = monthDimension.group();

    var sectorDimension = cf.dimension(function(d){ return d['#sector+list'];});
    var sectorGroup = sectorDimension.groupAll().reduce(reduceAdd, reduceRemove, reduceInitial).value();

    var mapDimension = cf.dimension(function(d){ return d['#adm'+config.admlevel+'+code']});
    var mapGroup = mapDimension.group();

    var surveyDimension = cf.dimension(function(d){ return d['#meta+assessmentid']});
    var surveyGroup = surveyDimension.group();

    var all = cf.groupAll();

    surveys
        .valueAccessor(function(x){ return x;})
        .group(unique_count(surveyGroup))
        .formatNumber(function(x){ return Math.round(x);});
        
    sectorGroup.all = function() {
            var newObject = [];
            for (var key in this) {
              if (this.hasOwnProperty(key) && key !== "all") {
                newObject.push({
                  key: key,
                  value: this[key]
                });
              }
            }
            return newObject;
    };

    monthChart.width($('#monthChart').width())
        .height(110)
        .dimension(monthDimension) 
        .group(monthGroup)
        .margins({top: 10, right: 50, bottom: 50, left: 30})
        .colors([color])
        .x(d3.scale.ordinal().domain(time))
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .yAxis().ticks(3);

    monthChart.renderlet(function (chart) {
                    chart.selectAll("g.x text")
                        .style("text-anchor", "end")
                        //.attr('dx', '0')
                      
                        .attr('transform', "rotate(-45)");
                })

    sectorChart.width($('#sectorChart').width())
        .height(510)
        .dimension(sectorDimension) 
        .group(sectorGroup)
        .margins({top: 10, right: 50, bottom: 40, left: 30})
            .colors(['#CCCCCC', color])
            .colorDomain([0, 1])
            .colorAccessor(function (d) {
                return 1;
            }) 
        .labelOffsetY(25)
        .elasticX(true)
        .xAxis().ticks(4);

    sectorChart.filterHandler (function (dimension, filters) {
        dimension.filter(null);   
        if (filters.length === 0){
            dimension.filter(null);
        } else {
            dimension.filterFunction(function (d) {
                for (var i=0; i < d.length; i++) {
                    if (filters.indexOf(d[i]) >= 0) return true;
                }
                return false; 
            });
        return filters; 
        }
    });

    mapChart.width($('#mapChart').width()).height(300)
            .dimension(mapDimension)
            .group(mapGroup)
            .center([0,0])
            .zoom(8)    
            .geojson(geom)
            .colors(config.mapcolors)
            .colorDomain([0,4])
            .colorAccessor(function (d) {
                var c =0
                if(d>config.mapboundaries[2]){
                    c=4;
                } else if (d>config.mapboundaries[1]) {
                    c=3;
                } else if (d>config.mapboundaries[0]) {
                    c=2;
                } else if (d>0) {
                    c=1;
                };
                return c
                
            })           
            .featureKeyAccessor(function(feature){
                return feature.properties[config.joinattr];
            }).popup(function(feature){
                return feature.properties[config.popupattr];
            })
            .renderPopup(true)
            .featureOptions({
                'fillColor': 'gray',
                'color': 'gray',
                'opacity':0.8,
                'fillOpacity': 0.1,
                'weight': 1
            });

    dc.dataTable("#data-table")
                .dimension(monthDimension)                
                .group(function (d) {
                    if(d['#adm'+config.admlevel+'+name']==undefined){
                        return d['#adm'+config.admlevel];
                    } else {
                        return d['#adm'+config.admlevel+'+name'];
                    }
                })
                .size(650)
                .columns([
                    function(d){
                       return d['#date+week']; 
                    },
                    function(d){
                       return d['#org+lead']; 
                    },
                    function(d){
                       return d['#meta+assessmenttitle']; 
                    },
                    function(d){
                        if(d['#sector+list'].length>4){
                            return 'Multisectoral'
                        }
                       return d['#sector+list']; 
                    },
                    function(d){
                        if(d['#meta+url'].length!=0&&d['#meta+url'].length!=null){
                            return '<a href="'+d['#meta+url']+'">Link to report</a>'; 
                        }
                       return "No Link available"
                    }
                ])

    dc.dataCount('#count-info')
            .dimension(cf)
            .group(all);

    dc.renderAll();

    $('.dc-chart g.row text').attr('stroke',config.color)
    $('.filter-count').css('color',config.color);
    $('.hdx-3w-info').css('color',config.color);
    $('a').css('color',config.color);
    $('#reset').css({'background':config.color,'color':'#ffffff','border-color':config.color});

    var map = mapChart.map();
    
    zoomToGeom(map,geom);

    function unique_count(group) {
        return {
            value: function() {
                return group.all().filter(function(kv) {
                   return kv.value > 0;
                }).length;
            }
        };
    }

    function zoomToGeom(map,geom){
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
    }

}

function getSectors(hxlSet){

    var sectorList=[];
    hxlSet.columns.forEach(function(c){
        if(c.tag==='#sector'){
            sectorList.push(c.displayTag);
        }
    });
    return sectorList;
}

function getMonday(d) {
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function deriveWeeks(data){
    var dateFormat = d3.time.format("%Y-%m-%d");
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    data.forEach(function(d){
        console.log(d);
        console.log('date');
        console.log(d['#date+published']);
        d['#date+published'] = dateFormat.parse(d['#date+published'].substring(0,10))
    });

    var min = d3.min(data,function(d){return d['#date+published']});
    var max = d3.max(data,function(d){return d['#date+published']});
    console.log(max);
    var week = getMonday(min);
    var weeks = [week.getDate()+" "+months[week.getMonth()]+" "+(week.getYear()-100)]
    while(week<max){
        week.setTime(week.getTime() + (7 * 24 * 60 * 60 * 1000));
        weeks.push(week.getDate()+" "+months[week.getMonth()]+" "+(week.getYear()-100));
    }

    return weeks;
}

function addWeeks(data){
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    data.forEach(function(d){
        if(d['#date+published']!=null){
            var week = getMonday(d['#date+published']);
            d['#date+week'] = week.getDate()+" "+months[week.getMonth()]+" "+(week.getYear()-100);
        }
    });
    return data
}

function deriveMonths(data){

    var dateFormat = d3.time.format("%d/%m/%Y");
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    data.forEach(function(d){
        d['#date+published'] = dateFormat.parse(d['#date+published'])
    });

    var min = d3.min(data,function(d){return d['#date+published']});
    var max = d3.max(data,function(d){return d['#date+published']});

    var weeks = [months[min.getMonth()]+" "+(min.getYear()-100)]
    var date = min;
    while(date<max){
        date.addMonths(1);
        weeks.push(months[date.getMonth()]+" "+(date.getYear()-100));
    }
    console.log(weeks)
    return weeks;    
}

function addMonths(data){
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    data.forEach(function(d){
        if(d['#date+published']!=null){
            d['#date+week'] = months[d['#date+published'].getMonth()]+" "+(d['#date+published'].getYear()-100);
        }
    });
    return data
}

function nestTag(data,tag){
    data.forEach(function(r){
        var list = [];
        Object.keys(r).forEach(function(k){
            if(k.substring(0,tag.length)==tag && r[k]==1){
                list.push(k.substring(tag.length+1,k.length));
            }
        })
        r[tag+'+list'] = list;
    });
    return data;
}

function hxlProxyToJSON(input,headers){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            keys = e;
        }
        if(headers==true && i>1){
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
        if(headers!=true && i>0){
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function acapsData(data){
    var output = [];
    data.forEach(function(d){
        row = {};
        row['#date+published'] = d['created_at'];
        row['#meta+assessmenttitle'] = d['title'];
        row['#org+lead'] = d['lead_organization'];
        row['#meta+url'] = '';
        row['#sector+list'] = [];
        for(key in d['sectors_covered']){
            row['#sector+list'].push(key);
        }
            
        row['#meta+assessmentid'] = d['id'];
        d['areas']['Communes']['locations'].forEach(function(l){
            row['#adm+name'] = l;
            row['#adm+code'] = l;
            var copiedObject = jQuery.extend({}, row)
            output.push(copiedObject);
        });
    });
    return output;

}
/*
var dataCall = $.ajax({ 
    type: 'GET', 
    url: config.HXLProxyURL,
    dataType: 'json',
});*/

var dataCall = $.ajax({ 
    type: 'GET', 
    url: 'http://54.166.53.245/api/v1/survey-of-surveys/?format=json',
    dataType: 'json',
});

//load geometry

var geomCall = $.ajax({ 
    type: 'GET', 
    url: config.geomURL, 
    dataType: 'json'
});

//initial setup
$('#title').html(config.title);
$('#description').html(config.description);

// initial styling
$('a').css('color',config.color);
$('#reset').css({'background':config.color,'color':'#ffffff','border-color':config.color});

//extending date object for addMonths

Date.isLeapYear = function (year) { 
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () { 
    return Date.isLeapYear(this.getFullYear()); 
};

Date.prototype.getDaysInMonth = function () { 
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};

//when both ready construct 3W

$.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
    $('#loading').hide();
    $('#viz').show();
    console.log('Loaded');

    if(config.topjson!=false){
        var geom = topojson.feature(geomArgs[0],geomArgs[0].objects[config.topojson]);
    } else {
        var geom = geomArgs[0];
    }
    var data = acapsData(dataArgs[0]);
    console.log(data);
    //var data= nestTag(hxlProxyToJSON(dataArgs[0]),'#sector');
    if(config.weeks){
        var weeks = deriveWeeks(data);
        data = addWeeks(data);
    } else {
        var weeks = deriveMonths(data);
        data = addMonths(data);        
    }  

    initDashboard(data,weeks,geom);
});