function createParallelSets(id) {
  var chart = d3.parsets()
  .dimensions(["evolution","rarity","resistances","types","weaknesses"])
  .width(645)
  .height(750);
  
  var vis = d3.select(id)
      .attr("width", chart.width())
      .attr("height", chart.height())
      .append("g")
      .attr("id", "gSetChart");
  
  d3.csv("data.csv").then(function(data) {
    vis.datum(data).call(chart);
  });
}

function updateParallelSets(){
  var chart = d3.parsets()
  .dimensions(dimensionOrder)
  .width(645)
  .height(750);

  const svg = d3.select("#gSetChart");
  svg.selectAll("*").remove();


  d3.csv("data.csv").then(function(data) {
    data = data.filter(function (elem){
      if(selectedType != "none"){
        return cat1(elem) || cat2(elem) && selectedType == elem.types && attr[0][1] <= elem.level && elem.level <= attr[0][0] && attr[1][1] <= elem.hp && elem.hp <= attr[1][0] && attr[2][1] <= elem.damage && elem.damage <= attr[2][0]
        && attr[3][1] <= elem.energyCost && elem.energyCost <= attr[3][0];
      }
      else{
        return cat1(elem) || cat2(elem) && attr[0][1] <= elem.level && elem.level <= attr[0][0] && attr[1][1] <= elem.hp && elem.hp <= attr[1][0] && attr[2][1] <= elem.damage && elem.damage <= attr[2][0]
        && attr[3][1] <= elem.energyCost && elem.energyCost <= attr[3][0];
      }
    });

    svg.datum(data).call(chart);
  });
}