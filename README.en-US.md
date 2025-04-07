# StarCompute Multimodal Application Examples

[English](README.en-US.md)

To help developers quickly integrate StarCompute's API services, the StarCompute team has carefully crafted a series of open-source AI application examples. These examples are built on Vite, using the TypeScript and React technology stack, aiming to provide developers with an intuitive and efficient reference to quickly understand and implement the calls to StarCompute API interfaces.

## Directory Structure


```plaintext
├─components
│  ├─Chat              # Chat component
│  ├─Header            # Header component
│  ├─Loading           # Loading component
│  ├─Other             # Other components
│  └─Voice             # Voice-related components
├─constants            # Constant definitions
├─contexts             # Context management
├─Home                 # Home page
├─ImageAnalysis        # Image analysis
├─ImageGen             # Image generation
├─services             # Service-related
├─SpeechToText         # Speech-to-text
├─TextGen              # Text generation
├─TextToSpeech         # Text-to-speech
├─types                # Type definitions
├─utils                # Utility functions
├─VoiceChat            # Voice chat
└─VoiceClone           # Voice cloning
```

## Project Architecture

- **Framework**: Vite
- **Language**: TypeScript
- **Front-end Framework**: React

## Project Features

- **Quick Start**: Clear project structure and detailed documentation to help developers quickly understand and integrate StarCompute APIs.
- **Rich Functionality**: Covers a variety of AI application scenarios to meet different development needs.
- **Easy to Expand**: Based on modern front-end technology stack, easy to expand and maintain.
- **High Security**: Configuration file separation to ensure the security of sensitive information.

## Application Scenarios

The open-source example applications cover the following seven core application scenarios. Each scenario provides complete implementation logic and detailed comments to help developers quickly experience the powerful functions of StarCompute.

### 1. Text Generation

By inputting relevant prompt information, the text generation interface of StarCompute is called to generate high-quality text content that meets the requirements, such as articles, stories, dialogues, etc.

### 2. Image Understanding

After uploading an image, the system can analyze and understand the image, extracting key information from it, such as object recognition, scene classification, image description, etc.

### 3. Image Generation

Based on the text description input by the user, the image generation interface of StarCompute is used to generate corresponding images, meeting diverse creative needs.

### 4. Voice Cloning

By providing a voice sample, the system can clone the voice, and then use the cloned voice for speech synthesis.

### 5. Speech Synthesis

Converts input text into natural and fluent speech, with multiple voice and speech style options available.

### 6. Speech Recognition

Recognizes the content of input voice files or real-time speech and converts it into text.

### 7. Voice Interaction

Enables voice dialogue interaction between users and the system. Users can ask questions through voice, and the system will respond accordingly.

## Installation and Configuration

### Clone the Project

Clone the project to your local machine using Git:


```bash
git clone https://github.com/staihex/apphub.git
```

### Install Dependencies

You can install project dependencies using the following two methods:

#### Using npm


```bash
npm install
```

#### Using yarn


```bash
yarn install
```

### Configuration Instructions

The project's configuration information and interface request settings are stored in `.env.development` (development environment) and `.env.production` (production environment) files according to the environment. You need to configure the correct parameter information in the corresponding environment file according to the actual situation, such as the StarCompute API key, etc.

Ensure the security of sensitive information in these files (such as API keys), and do not submit files containing sensitive information to version control systems.

### Example Configuration


```plaintext
# .env.development
VITE_API_KEY=your_development_api_key_here
VITE_API_ENDPOINT=https://api.development.example.com

# .env.production
VITE_API_KEY=your_production_api_key_here
VITE_API_ENDPOINT=https://api.production.example.com
```

## Usage

### Run the Project

After installing the dependencies, you can start the development server using the following command:


```bash
npm run dev
```

After starting, you can visit `http://localhost:5173/apphub/` in your browser to view the project.

### Build the Project

If you need to package the project into files usable in a production environment, you can use the following command:


```bash
npm run build
```

The packaged files will be generated in the `dist` directory.

## Contact and Support

If you encounter any problems during use, or have any suggestions, feel free to raise them in the GitHub Issues section, and we will handle them promptly.

## Version History

- **1.0.0**: Initial version released, including all the above functions.
