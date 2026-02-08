// -----------------------------
// VOCABULARY (TOKENIZER)
// -----------------------------
const wordIndex = {
  i: 1, love: 2, this: 3, movie: 4, product: 5, is: 6, amazing: 7,
  good: 8, great: 9, fantastic: 10, experience: 11,
  hate: 12, bad: 13, worst: 14, terrible: 15, disappointing: 16,
  very: 17, really: 18
};

const MAX_LEN = 6;

// -----------------------------
// TEXT → SEQUENCE
// -----------------------------
function tokenize(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .map(word => wordIndex[word] || 0);

  while (tokens.length < MAX_LEN) tokens.push(0);
  return tokens.slice(0, MAX_LEN);
}

// -----------------------------
// CREATE RNN MODEL (LSTM)
// -----------------------------
function createModel() {
  const model = tf.sequential();

  model.add(tf.layers.embedding({
    inputDim: 100,
    outputDim: 16,
    inputLength: MAX_LEN
  }));

  // 🔥 REAL RNN
  model.add(tf.layers.lstm({
    units: 32
  }));

  model.add(tf.layers.dense({
    units: 1,
    activation: "sigmoid"
  }));

  model.compile({
    optimizer: "adam",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"]
  });

  return model;
}

// -----------------------------
// TRAIN MODEL (BALANCED DATA)
// -----------------------------
async function trainModel(model) {
  const sentences = [
    "i love this movie",
    "this product is amazing",
    "fantastic experience",
    "very good product",
    "i hate this",
    "this is bad",
    "worst experience",
    "terrible and disappointing"
  ];

  // 1 = Positive, 0 = Negative (BALANCED)
  const labels = [1, 1, 1, 1, 0, 0, 0, 0];

  const xs = sentences.map(s => tokenize(s));
  const ys = tf.tensor2d(labels, [labels.length, 1]);

  const xsTensor = tf.tensor2d(xs, [xs.length, MAX_LEN]);

  await model.fit(xsTensor, ys, {
    epochs: 80,
    shuffle: true,
    verbose: 0
  });

  xsTensor.dispose();
  ys.dispose();
}

// -----------------------------
// PREDICT SENTIMENT
// -----------------------------
function predict(model, text) {
  const seq = tokenize(text);
  const input = tf.tensor2d([seq], [1, MAX_LEN]);

  const output = model.predict(input);
  const score = output.dataSync()[0];

  input.dispose();
  output.dispose();

  if (score > 0.5) {
    return `Positive 😊 (confidence ${(score * 100).toFixed(1)}%)`;
  } else {
    return `Negative 😠 (confidence ${((1 - score) * 100).toFixed(1)}%)`;
  }
}

// -----------------------------
// MAIN
// -----------------------------
async function main() {
  const model = createModel();
  await trainModel(model);

  document.getElementById("predictBtn").onclick = () => {
    const text = document.getElementById("textInput").value;

    if (text.trim() === "") {
      document.getElementById("result").innerText =
        "⚠️ Please enter some text";
      return;
    }

    const result = predict(model, text);
    document.getElementById("result").innerText = result;
  };
}

main();
