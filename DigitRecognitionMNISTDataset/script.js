import { MnistData } from './data.js';

async function run() {
  const data = new MnistData();
  await data.load();

  const model = getModel();
  await train(model, data);

  setupDrawing(model);
}

function getModel() {
  const model = tf.sequential();

  model.add(tf.layers.conv2d({
    inputShape: [28, 28, 1],
    kernelSize: 5,
    filters: 8,
    activation: 'relu'
  }));

  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));

  model.add(tf.layers.conv2d({
    kernelSize: 5,
    filters: 16,
    activation: 'relu'
  }));

  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.flatten());

  model.add(tf.layers.dense({
    units: 10,
    activation: 'softmax'
  }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}

async function train(model, data) {
  const BATCH_SIZE = 512;
  const TRAIN_SIZE = 5000;

  const { xs, labels } = data.nextTrainBatch(TRAIN_SIZE);

  await model.fit(
    xs.reshape([TRAIN_SIZE, 28, 28, 1]),
    labels,
    {
      batchSize: BATCH_SIZE,
      epochs: 10,
      shuffle: true,
      callbacks: tfvis.show.fitCallbacks(
        { name: 'Training', tab: 'Model' },
        ['loss', 'acc']
      )
    }
  );
}

function setupDrawing(model) {
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 20;

  let drawing = false;

  canvas.onmousedown = () => drawing = true;
  canvas.onmouseup = () => {
    drawing = false;
    ctx.beginPath();
  };
  canvas.onmousemove = e => {
    if (!drawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  };

  document.getElementById('clear').onclick = () => {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  document.getElementById('predict').onclick = () => {
    const small = document.createElement('canvas');
    small.width = 28;
    small.height = 28;
    small.getContext('2d').drawImage(canvas, 0, 0, 28, 28);

    const img = small.getContext('2d').getImageData(0, 0, 28, 28);
    const data = [];

    for (let i = 0; i < img.data.length; i += 4) {
      data.push(img.data[i] / 255);
    }

    const tensor = tf.tensor4d(data, [1, 28, 28, 1]);
    const prediction = model.predict(tensor).argMax(-1).dataSync()[0];

    document.getElementById('result').innerText =
      `Prediction: ${prediction}`;
  };
}

document.addEventListener('DOMContentLoaded', run);
