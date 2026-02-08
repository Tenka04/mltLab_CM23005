const IMAGE_SIZE = 784;
const NUM_CLASSES = 10;
const NUM_DATASET_ELEMENTS = 65000;

const NUM_TRAIN_ELEMENTS = 55000;

const MNIST_IMAGES_SPRITE_PATH =
  'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
const MNIST_LABELS_PATH =
  'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

export class MnistData {
  constructor() {
    this.shuffledTrainIndex = 0;
  }

  async load() {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const imgRequest = new Promise(resolve => {
      img.crossOrigin = '';
      img.onload = () => {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;

        const buffer =
          new ArrayBuffer(NUM_DATASET_ELEMENTS * IMAGE_SIZE * 4);
        const view = new Float32Array(buffer);

        canvas.width = img.width;
        canvas.height = 5000;

        for (let i = 0; i < NUM_DATASET_ELEMENTS / 5000; i++) {
          ctx.drawImage(img, 0, i * 5000, img.width, 5000, 0, 0, img.width, 5000);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          for (let j = 0; j < imageData.data.length / 4; j++) {
            view[i * IMAGE_SIZE * 5000 + j] = imageData.data[j * 4] / 255;
          }
        }

        this.images = view;
        resolve();
      };
      img.src = MNIST_IMAGES_SPRITE_PATH;
    });

    const labelsRequest = fetch(MNIST_LABELS_PATH);
    await Promise.all([imgRequest, labelsRequest]);

    this.labels = new Uint8Array(await (await labelsRequest).arrayBuffer());

    this.trainImages = this.images.slice(0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS);
    this.trainLabels = this.labels.slice(0, NUM_CLASSES * NUM_TRAIN_ELEMENTS);

    this.trainIndices = tf.util.createShuffledIndices(NUM_TRAIN_ELEMENTS);
  }

  nextTrainBatch(batchSize) {
    const xs = new Float32Array(batchSize * IMAGE_SIZE);
    const labels = new Uint8Array(batchSize * NUM_CLASSES);

    for (let i = 0; i < batchSize; i++) {
      const idx = this.trainIndices[this.shuffledTrainIndex++];
      xs.set(
        this.trainImages.slice(idx * IMAGE_SIZE, idx * IMAGE_SIZE + IMAGE_SIZE),
        i * IMAGE_SIZE
      );
      labels.set(
        this.trainLabels.slice(idx * NUM_CLASSES, idx * NUM_CLASSES + NUM_CLASSES),
        i * NUM_CLASSES
      );
    }

    return {
      xs: tf.tensor2d(xs, [batchSize, IMAGE_SIZE]),
      labels: tf.tensor2d(labels, [batchSize, NUM_CLASSES])
    };
  }
}
