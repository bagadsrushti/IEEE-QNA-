from optimum.onnxruntime import ORTModelForFeatureExtraction, ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig
from transformers import AutoTokenizer

name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
model = ORTModelForFeatureExtraction.from_pretrained(name, export=True)
tok = AutoTokenizer.from_pretrained(name)

model.save_pretrained("onnx_fp32")
tok.save_pretrained("onnx_fp32")

quantizer = ORTQuantizer.from_pretrained("onnx_fp32")
cfg = AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
quantizer.quantize(save_dir="onnx_int8", quantization_config=cfg)
tok.save_pretrained("onnx_int8")