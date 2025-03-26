/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Button, Divider, Form, Input, InputRef, message, Modal, Radio, Select, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CustomUpload from '../Other/CustomUpload';
import { request } from '../../services/request';
import { debounce } from 'lodash';

interface Values {
  name?: string;
  language?: string;
  desc?: string;
  prompt_text?: string;
  scenarios?: string;
  gender: number
}

interface AddVoiceProps {
  UpdateList: (pageNo?: number) => Promise<void>;
  handlePlayPause: () => void;
  playAudioRef: React.RefObject<any>;
  playNewAudio: (url: string) => void;
  apiKey: string;
}
let index = 0;

const AddVoice: React.FC<AddVoiceProps> = ({ UpdateList, apiKey, handlePlayPause, playAudioRef, playNewAudio }) => {
  const [form] = Form.useForm();
  const [voiceUrl, setVoiceUrl] = React.useState<string>('');
  const [name, setName] = React.useState('');
  const inputRef = React.useRef<InputRef>(null);
  const [items, setItems] = React.useState(['中文', '英文']);

  const [isNameDuplicate, setIsNameDuplicate] = useState<boolean | null>(null); // null 表示未检测，true 表示重复，false 表示不重复

  const [messageApi, contextHolder] = message.useMessage();

  const [type, setType] = useState(1)

  const onCreate = (values: Values) => {
    console.log('Received values of form: ', values);
    const url = 'https://test.staihex.com/api/ai/v1/voice/create';
    const options = {
      method: 'POST', // 明确指定请求方法
      headers: {
        authorization: apiKey,
      },
      data: {
        name: values.name,
        desc: values.desc,
        gender: values.gender,
        scenarios: values.scenarios,
        prompt_text: values.prompt_text,
        language: values.language,
        voice_url: voiceUrl
      },
    };

    request<any>(url, options)
      .then((data) => {
        console.log('POST 请求成功:', data);
        messageApi.open({
          type: 'success',
          content: '添加成功',
        });
        form.resetFields();
        UpdateList(1);
      })
      .catch((error) => {
        console.error('POST 请求失败:', error);
        messageApi.open({
          type: 'error',
          content: '添加失败',
        });
      });
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, name || `New item ${index++}`]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // 防抖处理名称重复检查
  const debouncedCheckNameDuplicate = debounce((name: string) => {
    if (!name.trim()) {
      setIsNameDuplicate(null);
      return;
    }

    const options = {
      method: 'POST',
      headers: {
        authorization: apiKey,
      },
      data: {
        voice_names: [name.trim()],
        check_tag: 0 // 1：仅检测用户级，2：仅检测系统级，否则检测全部的
      },
    };

    request<any>('https://test.staihex.com/api/ai/v1/voice/check_exists', options)
      .then((response) => {
        if (response.status == 200) {
          setIsNameDuplicate(false);
          form.setFieldValue("name", name);
        } else {
          setIsNameDuplicate(true);
          // form.setFieldValue("name", "");
        }
      })
      .catch((error) => {
        console.error('检查名称是否重复失败:', error);
        setIsNameDuplicate(null); // 设置为 null 表示未检测
        Modal.error({
          title: '检查名称失败',
          content: '请检查网络连接或确认链接是否正确。如果问题持续，请稍后重试。',
        });
      });
  }, 500);


  return (
    <div style={{ height: '75vh', overflow: 'auto', padding: '24px' }}>
      {contextHolder}
      <Form
        layout="vertical"
        form={form}
        name="form_in_modal"
        initialValues={{ modifier: 'public' }}
        clearOnDestroy
        onFinish={(values) => onCreate(values)}
      >
        <Form.Item initialValue={1} name="type" label="">
          <Radio.Group onChange={(e) => {
            if (e.target.value == 2) {
              form.setFieldValue('prompt_text', '我轻声诉说心底的诗篇，愿它能飘向远方的你。');
            } else {
              form.setFieldValue('prompt_text', '');
            }
            setType(e.target.value)
          }}>
            <Radio value={1}>上传文件</Radio>
            <Radio value={2}>录制音频</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name='prompt_text' label="原始文本" rules={[{ required: true, message: '请输入音频文件原始文本' }]}>
          <Input.TextArea maxLength={200} showCount disabled={type == 2} />
        </Form.Item>
        <Form.Item name='prompt_text' label="音频文件" rules={[{ required: true, message: '请上传或录制音频文件' }]}>
          <CustomUpload playAudioRef={playAudioRef} handlePlayPause={handlePlayPause} playNewAudio={playNewAudio} type={type} onUploadSuccess={(value: React.SetStateAction<string>) => {
            setVoiceUrl(value);
          }} />
        </Form.Item>
        <div style={{ display: 'flex' }}>
          <Form.Item name='name' label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input style={{ width: '300px' }} onChange={(e) => debouncedCheckNameDuplicate(e.target.value)} />
            {isNameDuplicate && (
              <div style={{ color: 'red' }}>
                {'名称已存在'}
              </div>
            )}
          </Form.Item>
          <Form.Item style={{ marginLeft: '80px' }} name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
            <Radio.Group>
              <Radio value={1}>男</Radio>
              <Radio value={2}>女</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
        <Form.Item name='language' label="音频使用的语言" rules={[{ required: true, message: '请选择音频使用的语言' }]}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择音频使用的语言"
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 8px 4px' }}>
                  <Input
                    placeholder="自定义"
                    ref={inputRef}
                    value={name}
                    onChange={onNameChange}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                    添加
                  </Button>
                </Space>
              </>
            )}
            options={items.map((item) => ({ label: item, value: item }))}
          />
        </Form.Item>
        <Form.Item name='scenarios' label="适用场景">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name='desc' label="描述">
          <Input.TextArea />
        </Form.Item>
        <Form.Item style={{ display: 'flex', justifyContent: 'end' }}>
          <Space>
            <Button htmlType="button" onClick={() => {
              form.resetFields()
              setType(1)
            }}
            >
              重置
            </Button>
            <Button type="primary" htmlType="submit">
              开始复刻
            </Button>
          </Space>
        </Form.Item>

      </Form>
    </div>
  );
};

export default AddVoice;