import type { App } from 'vue'

// Импорты DevExtreme компонентов
import DxTreeList, { DxColumn } from 'devextreme-vue/tree-list'
import DxFileUploader from 'devextreme-vue/file-uploader'
import DxSelectBox from 'devextreme-vue/select-box'
import DxTextBox from 'devextreme-vue/text-box'
import DxNumberBox from 'devextreme-vue/number-box'
import DxDateBox from 'devextreme-vue/date-box'
import DxCheckBox from 'devextreme-vue/check-box'
import DxButton from 'devextreme-vue/button'
import DxTextArea from 'devextreme-vue/text-area'

export default {
  install: (app: App) => {
    app.component('DxTreeList', DxTreeList)
    app.component('DxColumn', DxColumn)
    app.component('DxFileUploader', DxFileUploader)
    app.component('DxSelectBox', DxSelectBox)
    app.component('DxTextBox', DxTextBox)
    app.component('DxNumberBox', DxNumberBox)
    app.component('DxDateBox', DxDateBox)
    app.component('DxCheckBox', DxCheckBox)
    app.component('DxButton', DxButton)
    app.component('DxTextArea', DxTextArea)
  }
}