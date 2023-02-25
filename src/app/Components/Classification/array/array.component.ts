import { Component, OnInit } from '@angular/core';
import { ClassesService } from 'src/app/Services/classes.service';
import { ControlUIService } from 'src/app/Services/control-ui.service';
import { ScoresService } from 'src/app/Services/scores.service';

@Component({
  selector: 'app-array',
  templateUrl: './array.component.html',
  styleUrls: ['./array.component.scss'],
})
export class ArrayComponent implements OnInit {
  predString: string = '';
  gtString: string = '';
  predArray: Array<number>;
  gtArray: Array<number>;
  predictionArr: Array<number>;
  labelArr: Array<number>;
  maxClass: number = 12;
  selectedFile: File;


  constructor(
    private scoreService: ScoresService,
    public classService: ClassesService,
    public UICtrlService: ControlUIService
  ) {
    classService.setClasses([0, 1]);
    this.scoreService.initConfMat();
  }

  ngOnInit(): void {}


  readFile(event: any) {
    this.selectedFile = event.target.files[0];
    const fileReader = new FileReader();
    const dictionary: { [key: string]: number } = {
      "Preparation": 0, "CalotTriangleDissection": 1, "ClippingCutting": 2, "GallbladderDissection": 3,
      "GallbladderPackaging": 4, "CleaningCoagulation": 5, "GallbladderRetraction": 6
    };
    fileReader.readAsText(this.selectedFile, "UTF-8");
    fileReader.onload = () => {
      if (typeof fileReader.result === "string") {
        const file = JSON.parse(fileReader.result);
        const data = file[0]['label_segments'];
        const pred_data = file[0]['pred_segments'];
        this.labelArr = [];
        this.predictionArr = [];
        for(let i = 0; i < data.length; i++) {
          const value = data[i]['label'];
          let repeated: Array<number> = new Array(data[i]['value']).fill(dictionary[value]).flat();
          this.labelArr = this.labelArr.concat(repeated);
        }
        for(let j = 0; j < pred_data.length; j++) {
          const value = pred_data[j]['label'];
          let repeated: Array<number> = new Array(pred_data[j]['value']).fill(dictionary[value]).flat();
          this.predictionArr = this.predictionArr.concat(repeated);
        }
        }
      const uniqueCount = new Set(this.labelArr).size;
      this.classService.setClasses([...Array(uniqueCount).keys()]);
      this.scoreService.initConfMat();
        this.scoreService.updateConfusionMatrixFromArray(
          this.predictionArr,
          this.labelArr
        );
      }
    fileReader.onerror = (error) => {
      console.log(error);
    }
  }

  onChangeArray() {
    this.predString = this.predString
      .replace(/ /, ', ')
      .replace(/[^0-9- ,]+/, '').replace(/,,/g, ', ')
      .replace(/\s\s+/g, ' ');
    this.gtString = this.gtString
      .replace(/ /, ', ')
      .replace(/[^0-9-,]+/, '').replace(/,,/g, ', ')
      .replace(/\s\s+/g, ' ');
    let max_value = 0;
    this.gtArray = this.gtString
      .trim()
      .split(',')
      .map((value) => {
        let v = parseInt(value);
        if (v > this.maxClass) {
          this.gtString = this.gtString.replace(
            value,
            this.maxClass.toString()
          );
          v = this.maxClass;
        }
        if (v > max_value) {
          max_value = v;
        }
        return v;
      });
    this.predArray = this.predString
      .trim()
      .split(',')
      .map((value) => {
        let v = parseInt(value);

        if (v > this.maxClass) {
          this.predString = this.predString.replace(
            value,
            this.maxClass.toString()
          );
          v = this.maxClass;
        }
        if (v > max_value) {
          max_value = v;
        }
        return v;
      });
    if (max_value == 0) {
      max_value += 1;
    }
    this.predArray = this.predArray.filter((value) => {
      return !Number.isNaN(value);
    });
    this.gtArray = this.gtArray.filter((value) => {
      return !Number.isNaN(value);
    });
    this.classService.setClasses([...Array(max_value + 1).keys()]);
    this.scoreService.initConfMat();

    if (this.predArray.length > 0 && this.gtArray.length > 0) {
      this.scoreService.updateConfusionMatrixFromArray(
        this.predArray,
        this.gtArray
      );
    }
  }
}
