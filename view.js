start = 1577836800000
end = 1612137600000

// localStorage.removeItem("config");
var config = JSON.parse(localStorage.getItem("config"))

if (config==null) {
    config = {
        "External Temperatures": {
            feeds: [{name:"Heatpump Ambient", feedid:165140, units:"°C", weight:1.0}]
        },
        "Internal Temperatures": {
            option: "weight",
            feeds: [
                {name:"Diningroom Temperature", feedid:165195, units:"°C", weight:1.0},
                {name:"Bed1 Temperature", feedid:165134, units:"°C", weight:1.0},
                {name:"Bed2 Temperature", feedid:165136, units:"°C", weight:1.0},
                {name:"Kitchen Temperature", feedid:165088, units:"°C", weight:1.0},
            ],
            calculated:{
                "MIT":{name:"Mean Internal Temperature", units:"°C"}
            }
        },
        "Space heat": {
            feeds: [{name:"Space heating heat", feedid:165261, units:"W"}]
        },
        "Hot water heat": {
            option: "util",
            feeds: [{name:"DHW heat", feedid:165263, units:"W", util:0.5}],
            calculated:{
                "dhw_gains":{name:"Gains from hot water", units:"W"}
            }
        },    
        "Lighting, Appliances & Cooking": {
            feeds: [{name:"lac", feedid:165272, units:"W"}]
        },
        "Solar gains": {
            option: "scale",
            feeds: [{name:"solarpv", feedid:165203, units:"W", scale:3.0}],
            calculated:{
                "solar_gains":{name:"Solar gains", units:"W"}
            }
        },
        "Other gains": {
            option: "value",
            manual: [
                {name:"Metabolic", units:"W", value:120},
                {name:"Other", units:"W", value:10}
            ]
        },
        "Heat Loss Factor Calculation": {
            calculated:{
                "Heat":{name:"Total heat input", units:"W"},
                "Delta T":{name:"Delta T", units:"°K"},
                "Heat Loss Factor":{name:"Heat Loss Factor", units:"W/K"}
            }
        }
    }
}

// ---------------------------------------------------------------------
// Init data
// ---------------------------------------------------------------------

var feeds = []
var feeds_by_id = {}
var feeds_by_tag = {}

init();
calculate();

load_feed_lists(function(){
    load_template(function(){
        $("#sap_compare").html(template({config:config,feeds_by_tag:feeds_by_tag}));
    });
});

load_feed_data();

// ---------------------------------------------------------------------
// Init config
// ---------------------------------------------------------------------
function init() {
    var now = get_time();

    feedids = [];
    for (var cat in config) {
        for (var i in config[cat].feeds) {
            var feed = config[cat].feeds[i];
            
            // Create blank feed data entry
            if (feed.data==undefined) {
                config[cat].feeds[i].data = []
                for (var m=0; m<12; m++) config[cat].feeds[i].data[m] = [0,0]
                config[cat].feeds[i].last_update = 0
            }
            
            // Register feeds for reload
            if ((now-feed.last_update)>(3600*24)) {
                config[cat].feeds[i].last_update = now
                feedids.push(feed.feedid)
            }
        }
        
        // Calculated entry
        for (var i in config[cat].calculated) {
            config[cat].calculated[i].data = []
        }
        
        // Set manual entry
        for (var i in config[cat].manual) {
            config[cat].manual[i].data = []
            for (var m=0; m<12; m++) config[cat].manual[i].data[m] = config[cat].manual[i].value
        } 
    }
    
}

// ---------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------
function calculate() {

    for (var m=0; m<12; m++) {
        // Calculate Mean Internal Temperature
        var sum = 0;
        var sum_weight = 0;
        var n = 0;
        for (var i in config["Internal Temperatures"].feeds) {
            let value = config["Internal Temperatures"].feeds[i].data[m][0]
            if (value!=null) {
                let weight = config["Internal Temperatures"].feeds[i].weight
                sum += value * weight
                sum_weight += weight
            }
        }
        let mean_internal_temperature = null;
        if (sum_weight>0) mean_internal_temperature = sum / sum_weight;
        
        // Load in feed values for month
        let outside = config["External Temperatures"].feeds[0].data[m][0]
        let space_heat = config["Space heat"].feeds[0].data[m][0]
        let dhw_heat = config["Hot water heat"].feeds[0].data[m][0]
        let lac = config["Lighting, Appliances & Cooking"].feeds[0].data[m][0]
        let solar_proxy = config["Solar gains"].feeds[0].data[m][0]
        let metabolic = config["Other gains"].manual[0].data[m]
        let other_gains = config["Other gains"].manual[1].data[m]
        
        // Perform calculations
        var deltaT = null
        if (mean_internal_temperature!=null && outside!=null) {
            deltaT = mean_internal_temperature - outside
        }

        // Calculate dhw gains as dhw heat x utlilisation factor
        let dhw_gains = null
        if (dhw_heat!=null) {
            dhw_gains = dhw_heat*config["Hot water heat"].feeds[0].util
        }

        // Calculate solar gains as solar proxy x scaling factor
        let solar_gains = null
        if (solar_proxy!=null) {
            solar_gains = solar_proxy*config["Solar gains"].feeds[0].scale
        }
     
        // Sum of all heat sources
        var total_heat = null
        if (space_heat!=null && lac!=null && solar_gains!=null) {
           total_heat = space_heat + dhw_gains + lac + solar_gains + metabolic + other_gains
        }
        
        // Heat loss factor
        let heat_loss_factor = null;
        if (total_heat!=null && deltaT!=null) {
            heat_loss_factor = total_heat / deltaT
        }
        
        // Set back in main config obj
        config["Internal Temperatures"].calculated["MIT"].data[m] = mean_internal_temperature
        config["Hot water heat"].calculated["dhw_gains"].data[m] = dhw_gains
        config["Solar gains"].calculated["solar_gains"].data[m] = solar_gains
        config["Heat Loss Factor Calculation"].calculated["Delta T"].data[m] = deltaT  
        config["Heat Loss Factor Calculation"].calculated["Heat"].data[m] = total_heat
        config["Heat Loss Factor Calculation"].calculated["Heat Loss Factor"].data[m] = heat_loss_factor
    }
}

function load_feed_data() {
    if (feedids.length>0) {
        get_average(feedids,start,end,'monthly',function(result){
            
            for (var z in result) {
            
                var monthly = []
                for (var m=0; m<12; m++) {
                    monthly.push([
                        result[z].data[m][1],
                        result[z].data[m][2]
                    ])
                }
                set_feed_data(result[z].feedid,monthly)
            }
            calculate();
            
            localStorage.setItem("config", JSON.stringify(config));
            $("#sap_compare").html(template({config:config,feeds_by_tag:feeds_by_tag}));
        });
    }
}

// ---------------------------------------------------------------------
// 
// ---------------------------------------------------------------------
function set_feed_data(feedid,data) {
    for (var cat in config) {
        for (var i in config[cat].feeds) {
            if (feedid==config[cat].feeds[i].feedid) {
                config[cat].feeds[i].data = data
                return true;
            }
        }
    }  
}

function load_feed_lists(callback) {
    $.ajax({                                      
        url: path+'feed/list.json',
        dataType: 'json',
        async: true,                      
        success: function(result) {
        
            feeds = result
            feeds_by_id = {}
            feeds_by_tag = {}
        
            for (var z in feeds) {
                feeds_by_id[feeds[z].id] = feeds[z]
            
                if (feeds_by_tag[feeds[z].tag]==undefined) {
                    feeds_by_tag[feeds[z].tag] = []
                }
                feeds_by_tag[feeds[z].tag].push(feeds[z])
            }     
        
            callback();
        }
    });
}

function load_template(callback) {
    $.ajax({
        url: path+'Modules/sapcompare/template.html',
        cache: false,
        success: function(result) {
            template  = Handlebars.compile(result);
            callback(result);
        }
    });
}

function get_average(feedids,start,end,interval,callback){
    $.ajax({                                      
        url: path+'feed/average.json',                         
        data: "ids="+feedids.join(",")+"&start="+start+"&end="+end+"&mode="+interval+"&skipmissing=0&limitinterval=0&coverage=1",
        dataType: 'json',
        async: true,                      
        success: function(result) {    
            callback(result);
        }
    });
}

function get_time() {
    return (new Date()).getTime()*0.001;
}

$("#sap_compare").on("click","#toggle_units",function(){
    $(".units").toggle();
});

Handlebars.registerHelper('ifeq', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper('ifmorethan', function(arg1, arg2, options) {
    return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper('toFixed', function(value,dp) {
   if (value!=null) return value.toFixed(dp);
});
Handlebars.registerHelper('toUpperCase', function(str) {
  return str.toUpperCase();
});
Handlebars.registerHelper('times', function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
});
Handlebars.registerHelper('quality', function(quality) {
  var class_name = ''
  if (quality>=90) class_name = 'grn'
  else if (quality>=60) class_name = 'yel' 
  else class_name = 'red'
  return class_name
});
