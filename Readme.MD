# MLT Lab - CM23005

## Overview
This repository contains a comprehensive collection of Machine Learning and TensorFlow.js lab assignments. The projects demonstrate various machine learning techniques including linear regression, digit recognition using convolutional neural networks (CNN), and sentiment analysis using recurrent neural networks (RNN).

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Folder Descriptions](#folder-descriptions)
   - [DigitRecognitionMNISTDataset](#digitrecognitionmnistdataset)
   - [Linear Regression with Synthetic Data](#linear-regression-with-synthetic-data)
   - [prelab](#prelab)
   - [Text Sentiment Analysis](#text-sentiment-analysis)
3. [Technologies Used](#technologies-used)
4. [Getting Started](#getting-started)

---

## Project Structure

```
mltLab_CM23005/
├── Readme.MD
├── DigitRecognitionMNISTDataset/
│   ├── data.js
│   ├── index.html
│   ├── script.js
│   └── MINST Dataset training and testing.pdf
├── Linear Regression with Synthetic Data/
│   ├── Lab Assingment 1/
│   │   └── index.html
│   ├── Lab Assingment 2/
│   │   └── index.html
│   ├── Lab Assingment 3/
│   │   └── index.html
│   └── MLT_P1_output.pdf
├── prelab/
│   ├── index.html
│   ├── HelloTensorFLowJS/
│   │   └── index.html
│   ├── LabAssignment2/
│   │   └── index2.html
│   ├── LabAssignment3/
│   │   └── index3.html
│   └── MLT PreLab output.pdf
└── Text Sentiment Analysis/
    ├── index.html
    ├── script.js
    └── RNN prediction.pdf
```

---

## Folder Descriptions

### DigitRecognitionMNISTDataset

**Aim:** Build and train a Convolutional Neural Network (CNN) to recognize handwritten digits from the MNIST dataset.

**Contents:**
- `data.js` - MNIST dataset loader and preprocessing
- `script.js` - CNN model implementation with Conv2D layers, MaxPooling, and training logic
- `index.html` - Web interface for digit recognition and interactive drawing
- `MINST Dataset training and testing.pdf` - Documentation and results

**Key Features:**
- CNN architecture with convolutional and pooling layers
- Model training on MNIST dataset
- Interactive canvas for real-time digit recognition
- TensorFlow.js integration for browser-based ML

---

### Linear Regression with Synthetic Data

**Aim:** Implement and demonstrate linear regression with various configurations using synthetic datasets and explore different learning scenarios.

**Contents:**
- **Lab Assignment 1** - Basic linear regression implementation
- **Lab Assignment 2** - Advanced regression with enhanced visualizations
- **Lab Assignment 3** - Extended regression scenarios with multiple features
- `MLT_P1_output.pdf` - Lab results and performance metrics

**Key Features:**
- Synthetic data generation
- Model training and evaluation
- Visualization of regression lines and data points
- Parameter tuning and optimization
- Interactive web-based implementations

---

### prelab

**Aim:** Introduction to TensorFlow.js and foundational ML concepts through beginner-friendly exercises.

**Contents:**
- `index.html` - Main prelab overview page
- **HelloTensorFlowJS/** - Initial TensorFlow.js setup and tensor operations
  - Basic tensor creation and manipulation
  - Verification of TensorFlow.js installation
- **LabAssignment2/** (`index2.html`) - Intermediate concepts and operations
- **LabAssignment3/** (`index3.html`) - Advanced TensorFlow.js techniques
- `MLT PreLab output.pdf` - Prelab exercise results and documentation

**Key Features:**
- TensorFlow.js library introduction
- Tensor manipulation and operations
- Basic computational graph understanding
- Foundation for advanced ML concepts

---

### Text Sentiment Analysis

**Aim:** Implement a Recurrent Neural Network (RNN) using LSTM layers to classify text sentiment as positive or negative.

**Contents:**
- `script.js` - RNN/LSTM model implementation with tokenization
- `index.html` - Web interface for sentiment prediction
- `RNN prediction.pdf` - Model predictions and analysis results

**Key Features:**
- Custom vocabulary and tokenizer implementation
- LSTM-based sequential model
- Text preprocessing and padding
- Real-time sentiment prediction on user input
- Interactive web interface for testing

---

## Technologies Used

- **TensorFlow.js** - Machine learning library for JavaScript (browser-based)
- **HTML5** - Frontend markup and structure
- **JavaScript (ES6+)** - Model implementation and logic
- **Canvas API** - Interactive drawing for digit recognition
- **CSS** - Styling and UI components

---

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Basic understanding of machine learning concepts
- Text editor or IDE for viewing/editing code

### Running the Projects

1. **Navigate to any project folder**
   ```
   cd "path/to/project"
   ```

2. **Open the HTML file in a browser**
   ```
   # Open index.html in your preferred browser
   # For example, double-click the file or use:
   # (Windows) start index.html
   # (Mac) open index.html
   # (Linux) xdg-open index.html
   ```

3. **Interactive Usage**
   - Follow the on-screen instructions for each project
   - For digit recognition: Draw digits on the canvas
   - For sentiment analysis: Enter text to get sentiment predictions
   - For linear regression: Observe the fitted regression line on synthetic data

---

## Learning Outcomes

After completing all projects, you will understand:

✓ Fundamentals of neural networks and deep learning  
✓ Convolutional Neural Networks (CNN) for image classification  
✓ Recurrent Neural Networks (RNN/LSTM) for sequence modeling  
✓ Linear regression and optimization techniques  
✓ Data preprocessing and feature engineering  
✓ Model training, evaluation, and validation  
✓ TensorFlow.js for browser-based machine learning  
✓ Interactive ML applications using web technologies  

---

## Notes

- All projects use TensorFlow.js for client-side ML (no backend server required)
- Projects are self-contained and can be run independently
- PDF files contain detailed results, analysis, and model performance metrics
- Code includes comments explaining key ML concepts

---

## Author Information

**Course:** MLT (Machine Learning) - CM23005

---

## License

This project is part of an academic course and is provided for educational purposes.
