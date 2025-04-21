from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
import tensorflow as tf

app = Flask(__name__)

# Load your trained model
model = tf.keras.models.load_model("asl/ASL-Finger-Spelling-To-Text/kaggle/model/model.h5")
 # adjust path as needed

# Define your class labels
class_labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
                'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

def preprocess(image_np):
    # Resize and normalize as per your training config
    resized = tf.image.resize(image_np, (64, 64))  # adjust size to match your model
    normalized = resized / 255.0
    return np.expand_dims(normalized, axis=0)  # add batch dimension

def process_image(image_np):
    input_tensor = preprocess(image_np)
    prediction = model.predict(input_tensor)
    predicted_class = np.argmax(prediction)
    return class_labels[predicted_class]

@app.route('/upload', methods=['POST'])
def upload_image():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No image uploaded'}), 400

    try:
        image = Image.open(file.stream).convert("RGB")
        image_np = np.array(image)

        prediction = process_image(image_np)
        return jsonify({'prediction': prediction})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001)
