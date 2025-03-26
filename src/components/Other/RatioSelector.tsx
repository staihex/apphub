import { useState } from "react";
import { Radio } from "antd";

const options = [
  { label: "低", value: "low", size: "1024x1024" },
  { label: "标准", value: "standard", size: "1280x1280" },
  { label: "高", value: "high", size: "1536x1024" },
];

const RatioSelector = () => {
  const [selected, setSelected] = useState("standard");

  return (
    <Radio.Group value={selected} onChange={(e) => setSelected(e.target.value)} style={{ display: "flex", gap: "10px" }}>
      {options.map((option) => (
        <div
          key={option.value}
          style={{
            width: "120px",
            height: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: selected === option.value ? "2px solid #1677ff" : "2px solid #ddd",
            borderRadius: "8px",
            textAlign: "center",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: selected === option.value ? "bold" : "normal",
            color: selected === option.value ? "#000" : "#aaa",
            backgroundColor: selected === option.value ? "#f0f7ff" : "#fff",
          }}
          onClick={() => setSelected(option.value)}
        >
          <Radio value={option.value} style={{ display: "none" }} />
          <div>{option.label}</div>
          {/* <div>{option.size}</div> */}
        </div>
      ))}
    </Radio.Group>
  );
};

export default RatioSelector;
