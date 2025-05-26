import DbscanJS from 'dbscanjs';
import TSNE from 'tsne-js';

const eps = 0.01;  // Максимальное расстояние для соседей
const minPoints = 4;  // Минимальное количество точек в кластере

function cosineDistance(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return 1 - dotProduct / (normA * normB);
}

export async function getClusters(embeddings) {
  let model = new TSNE({
    dim: 2
  });

  model.init({
    data: embeddings.map((e) => e.em),
    perplexity: 5,  // Попробуйте уменьшить perplexity
    eta: 200     // Скорость обучения
  });

  model.run();
  model.rerun();
  
  let output = model.getOutput();

  let _output = output.map((o, index) => {
    return [...o, embeddings[index].text]
  });


  const clustersData = DbscanJS(output, cosineDistance, eps, Math.round(embeddings.length / 200) + 1)

  const err = [];
  const result = [];
  for (const cluster in clustersData) {
    if (clustersData[cluster] === -1) {
      err.push(embeddings[cluster].text);
      continue;
    }
    result[clustersData[cluster]] = result[clustersData[cluster]] ? result[clustersData[cluster]] : [];

    result[clustersData[cluster]].push(embeddings[cluster].text);
  }

  const clusters = [];

   result.forEach((cluster, index) => {
    clusters.push({ cluster: index, elements: cluster });
  });


  return { clusters, view: _output, clustersData };
}









// import Clustering from 'hdbscanjs';
// import TSNE from 'tsne-js';

// const eps = 0.2;  // Максимальное расстояние для соседей
// const minPoints = 2;  // Минимальное количество точек в кластере

// export async function getClusters(embeddings) {
//   console.log('Clustering >>> ', Clustering.default);
//   let model = new TSNE({
//     dim: 2
//   });

//   model.init({
//     data: embeddings.map((e) => e.em),
//     perplexity: 5,  // Попробуйте уменьшить perplexity
//     eta: 200     // Скорость обучения
//   });

//   model.run();
//   model.rerun();
  
//   let output = model.getOutput();

//   output = output.map((o, index) => {
//     return [...o, embeddings[index].text]
//   });

//   console.log('output >>> ', output);

//   // const dbscan = new clu.OPTICS();
//   // const clusters = dbscan.run(embeddings.map((e) => e.em), 1, minPoints);

//   const dataset = embeddings.map((e) => {
//     return { data: e.em, opt: 0 }
//   });
  
//   // two distance measure functions are supported:
//   // 1) euclidean
//   // 2) geoDist (take inputs as lonlat points)
//   // const distFunc = Clustering.distFunc.geoDist;

//   const Hdbscan = Clustering.default;
  
//   const cluster = new Hdbscan(dataset);
//   const treeNode = cluster.getTree();

//   // Пример фильтрации кластеров по определённому критерию
// const filterFunc = node => node.data.length >= 2;
// const filteredNodes = treeNode.filter(filterFunc);

// // Вывод результатов
// filteredNodes.forEach((node, index) => {
//   console.log(`Кластер ${index + 1}:`);
//   node.data.forEach(point => {
//     console.log(`  Точка: ${point.data}`);
//   });
// });
  

//   const result = [];
//   for (const cluster in clusters) {
//     const elements = [];
    
//     clusters[cluster].forEach(id => {
//       elements.push(embeddings[id].text);
//     });
//     result.push({ cluster, elements })
//   }

//   return { clusters: result, view: output };

// }



















// import clu from 'density-clustering';
// import TSNE from 'tsne-js';

// const eps = 0.2;  // Максимальное расстояние для соседей
// const minPoints = 2;  // Минимальное количество точек в кластере

// export async function getClusters(embeddings) {
//   let model = new TSNE({
//     dim: 2
//   });

//   model.init({
//     data: embeddings.map((e) => e.em),
//     perplexity: 5,  // Попробуйте уменьшить perplexity
//     eta: 200     // Скорость обучения
//   });

//   model.run();
//   model.rerun();
  
//   let output = model.getOutput();

//   output = output.map((o, index) => {
//     return [...o, embeddings[index].text]
//   });

//   console.log('output >>> ', output);

//   const dbscan = new clu.OPTICS();
//   const clusters = dbscan.run(embeddings.map((e) => e.em), 1, minPoints);

//   const result = [];
//   for (const cluster in clusters) {
//     const elements = [];
    
//     clusters[cluster].forEach(id => {
//       elements.push(embeddings[id].text);
//     });
//     result.push({ cluster, elements })
//   }

//   return { clusters: result, view: output };

// }

