import sys
from . import feature_pipeline, inference

sys.modules.setdefault("src.trade_anomaly", sys.modules[__name__])
sys.modules.setdefault("src.trade_anomaly.feature_pipeline", feature_pipeline)
sys.modules.setdefault("trade_anomaly", sys.modules[__name__])
sys.modules.setdefault("trade_anomaly.feature_pipeline", feature_pipeline)
