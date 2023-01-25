import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ClassesService } from 'src/app/Services/classes.service';
import { ControlUIService } from 'src/app/Services/control-ui.service';
import { ScoresService } from 'src/app/Services/scores.service';
import {Score, Stats} from 'src/app/statistic';
import { Phase } from './phase';

@Component({
  selector: 'app-temporal',
  templateUrl: './temporal.component.html',
  styleUrls: ['./temporal.component.scss'],
})
export class TemporalComponent implements OnInit {

  isDragging: boolean = false;
  listPhasePrediction: Array<Phase>;
  predictionArr: Array<number>;
  isNew: boolean = true;
  labelArr: Array<number>;
  video_count : number = 1;
  isVideoUploaded: boolean = false;
  segment_arr_pred : Array<number>;
  segment_arr_label : Array<number>;
  selectedFile: File;
  listPhaseGt: Array<Phase>;
  activePhase?: Phase;
  startPosition: number;
  isOneVideoUpdate : boolean = false;
  final_pred_array: Map<number, Array<number>>;
  final_label_array: Map<number, Array<number>>;
  nFrames: number = 3000;
  framerate = 24;
  tool: string = 'grab';
  currentTime:number = 0;
  localUrl: any[]
  @ViewChild("videoPlayer", { static: false }) videoplayer: ElementRef;
  videoPlayerCtx:HTMLVideoElement
  pred_step: number = 0;
  label_step: number = 0;

  constructor(
    public scoreService: ScoresService,
    public classService: ClassesService,
    public UICtrlService: ControlUIService
  ) {
    this.buildDefaultSetup()
  }
  ngOnInit(): void {}
  buildDefaultSetup(){
    this.listPhasePrediction = new Array<Phase>(5);
    this.listPhaseGt = new Array<Phase>(5);

    let n_samples = 5;
    let width = 100 / n_samples;
    let previous = null;
    for (let i = 0; i < 5; i++) {
      previous = {
        start: i * width,
        width: width,
        label: i,
        next: null,
        previous: previous,
        exists: true,
      };
      this.listPhasePrediction[i] = previous;
      if (i > 0) {
        this.listPhasePrediction[i - 1].next = previous;
      }
    }
    previous = null;
    for (let i = 0; i < 5; i++) {
      previous = {
        start: i * width,
        width: width,
        label: i,
        next: null,
        previous: previous,
        exists: true,
      };
      this.listPhaseGt[i] = previous;
      if (i > 0) {
        this.listPhaseGt[i - 1].next = previous;
      }
    }
    this.classService.setClasses([0, 1, 2, 3, 4]);
    this.classService.setCurrentClass(0);

    this.scoreService.initConfMat();
    if(!this.isVideoUploaded || this.isNew) this.updateScore();

  }

  addClass() {
    this.classService.addClass();
    this.updateScore();
  }
  changeActiveClass(classIndex: number) {
    this.classService.currentClass = classIndex;
    this.scoreService.updateStateMatrix();
  }
  changeTool(tool: string) {
    this.tool = tool;
  }

  loadSelectedFile(event: any) {
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
        this.video_count = file.length;
        this.isNew = false;
        if (this.video_count > 1) { //Multiple Videos
          this.isVideoUploaded = true;
          this.buildDefaultSetup();
          this.scoreService.isSelectedVideo = false;
          this.scoreService.isMulti = true;
          this.final_label_array = new Map<number, Array<number>>();
          this.final_pred_array = new Map<number, Array<number>>();
          for(let i=0; i<this.video_count; i++) {
            const data = file[i]['label_segments'];
            const pred_data = file[i]['pred_segments'];
            this.labelArr = [];
            this.predictionArr = [];
            for (let i = 0; i < data.length; i++) {
              const value = data[i]['label'];
              let repeated: Array<number> = new Array(data[i]['value']).fill(dictionary[value]).flat();
              this.labelArr = this.labelArr.concat(repeated);
            }
            this.final_label_array.set(i, this.labelArr);
            for (let j = 0; j < pred_data.length; j++) {
              const value = pred_data[j]['label'];
              let repeated: Array<number> = new Array(pred_data[j]['value']).fill(dictionary[value]).flat();
              this.predictionArr = this.predictionArr.concat(repeated);
            }
            this.final_pred_array.set(i, this.predictionArr);
            const uniquePredCount = new Set(this.predictionArr).size;
            const uniqueLabelCount = new Set(this.labelArr).size;
            const uniqueCount = Math.max(uniquePredCount, uniqueLabelCount);
            this.classService.setClasses([...Array(uniqueCount).keys()]);
            this.scoreService.initConfMat();
            this.scoreService.updateConfusionMatrixFromArrayMultiVideos(
              this.predictionArr,
              this.labelArr,
              i,
              this.video_count, this.isOneVideoUpdate
            );
          }
        }
        if (this.video_count == 1) { // Single Videos
          this.scoreService.isMulti = false;
          const data = file[0]['label_segments'];
          const pred_data = file[0]['pred_segments'];
          this.labelArr = [];
          this.predictionArr = [];
          for (let i = 0; i < data.length; i++) {
            const value = data[i]['label'];
            let repeated: Array<number> = new Array(data[i]['value']).fill(dictionary[value]).flat();
            this.labelArr = this.labelArr.concat(repeated);
          }
          for (let j = 0; j < pred_data.length; j++) {
            const value = pred_data[j]['label'];
            let repeated: Array<number> = new Array(pred_data[j]['value']).fill(dictionary[value]).flat();
            this.predictionArr = this.predictionArr.concat(repeated);
          }

          const uniquePredCount = new Set(this.predictionArr).size;
          const uniqueLabelCount = new Set(this.labelArr).size;
          const uniqueCount = Math.max(uniquePredCount, uniqueLabelCount)
          this.classService.setClasses([...Array(uniqueCount).keys()]);
          this.scoreService.initConfMat();
          this.scoreService.updateConfusionMatrixFromArray(
            this.predictionArr,
            this.labelArr
          );
          this.nFrames = this.predictionArr.length;
          this.buildPhaseSetup(this.predictionArr, this.labelArr);
        }
      }
    }
    fileReader.onerror = (error) => {
      console.log(error);
    }
  }

  downloadCSV() {
    let csvData = this.convertToCSV(this.segment_arr_label, this.segment_arr_pred);
    let blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
    let dwldLink = document.createElement("a");
    let url = URL.createObjectURL(blob);
    let isSafariBrowser = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
    if (isSafariBrowser) {  //if Safari open in new window to save file with random filename.
      dwldLink.setAttribute("target", "_blank");
    }
    dwldLink.setAttribute("href", url);
    dwldLink.setAttribute("download", "data.csv");
    dwldLink.style.visibility = "hidden";
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
  }

  convertToCSV(data1: Array<number>, data2: Array<number>) {
    let csv = '';
    csv += 'label,prediction\n';
    let length = Math.max(data1.length, data2.length);
    for(let i = 0; i < length; i++) {
      csv += (data1[i] !== undefined ? data1[i] : '') + ',' + (data2[i] !== undefined ? data2[i] : '') + '\n';
    }
    return csv;
  }


  segmentArrayPhase(array: number[]) {

    let segments: any[] = [];
    let currentSegment: any[] = [array[0]];

    for (let i = 1; i < array.length; i++) {
      if (array[i] === array[i - 1]) {
        currentSegment.push(array[i]);
      } else {
        segments.push(currentSegment);
        currentSegment = [array[i]];
      }
    }
    segments.push(currentSegment);
    return segments;
  }

  //dropdown list handler
  handleVideoSelection(event: any) {
    this.scoreService.isSelectedVideo = false;
    this.isOneVideoUpdate = true;
    let video_number = event;
    let video_score = new Array<Score>();
    let item = this.scoreService.final_multi_result.get(video_number) || [];
    for(let i=0; i<item.length; i++) {
      let args = {
        name: item[i].name,
        score: item[i].score,
        perClassScore: item[i].perClassScore,
        microAverage: item[i].microAverage,
        macroAverage: item[i].macroAverage,
        macroWeightedAverage: item[i].macroWeightedAverage,
      };
      video_score.push(new Score(args));
    }
    this.scoreService.isSelectedVideo = true;
    let prediction = this.final_pred_array.get(video_number) || [];
    let groundtruth = this.final_label_array.get(video_number) || [];
    this.scoreService.selectedVideo = video_number;
    this.scoreService.fillOneMetricTable(video_score);
    this.buildMultiPhaseSetup(prediction, groundtruth, video_number);
  }

  buildPhaseSetup(prediction: Array<number>, label: Array<number>){
    this.listPhasePrediction = new Array<Phase>(7);
    this.listPhaseGt = new Array<Phase>(7);

    var prediction_segments = this.segmentArrayPhase(prediction);
    var label_segments = this.segmentArrayPhase(label);
    let n_pred_samples = prediction_segments.length;
    let pred_width = 100 / n_pred_samples;
    let previous = null;
    let index  = 0;
    for (let i = 0; i < n_pred_samples; i++) {
      let width_pred = prediction_segments[i].length;
      previous = {
        start: index,
        width: width_pred,
        label: prediction_segments[i][0],
        next: null,
        previous: previous,
        exists: true,
      };

      this.listPhasePrediction[i] = previous;
      if (i > 0) {
        this.listPhasePrediction[i - 1].next = previous;
      }
      index = index + width_pred;
    }
    previous = null;
    let n_label_samples = label_segments.length;
    //let width_label = 100 / n_label_samples;
    let label_index = 0;
    for (let i = 0; i < n_label_samples; i++) {
      let width_label = label_segments[i].length;
      previous = {
        start: label_index,
        width: width_label,
        label: label_segments[i][0],
        next: null,
        previous: previous,
        exists: true,
      };
      this.listPhaseGt[i] = previous;
      if (i > 0) {
        this.listPhaseGt[i - 1].next = previous;
      }
      label_index = label_index + width_label;
    }
    const uniquePredCount = new Set(this.predictionArr).size;
    const uniqueLabelCount = new Set(this.labelArr).size;
    const uniqueCount = Math.max(uniquePredCount, uniqueLabelCount)
    this.classService.setClasses([...Array(uniqueCount).keys()]);
    //this.classService.setClasses([0, 1, 2, 3, 4, 5, 6]);
    this.classService.setCurrentClass(0);

    this.scoreService.initConfMat();
    this.updateScore();

  }

  buildMultiPhaseSetup(prediction: Array<number>, label: Array<number>, video_id:number){
    this.listPhasePrediction = new Array<Phase>(7);
    this.listPhaseGt = new Array<Phase>(7);
    var prediction_segments = this.segmentArrayPhase(prediction);
    var label_segments = this.segmentArrayPhase(label);
    let n_pred_samples = prediction_segments.length;
    let pred_width = 100 / n_pred_samples;
    let previous = null;
    let index  = 0;
    for (let i = 0; i < n_pred_samples; i++) {
      let width_pred = prediction_segments[i].length;
      previous = {
        start: index,
        width: width_pred,
        label: prediction_segments[i][0],
        next: null,
        previous: previous,
        exists: true,
      };

      this.listPhasePrediction[i] = previous;
      if (i > 0) {
        this.listPhasePrediction[i - 1].next = previous;
      }
      index = index + width_pred;
    }
    previous = null;
    let n_label_samples = label_segments.length;
    //let width_label = 100 / n_label_samples;
    let label_index = 0;
    for (let i = 0; i < n_label_samples; i++) {
      let width_label = label_segments[i].length;
      previous = {
        start: label_index,
        width: width_label,
        label: label_segments[i][0],
        next: null,
        previous: previous,
        exists: true,
      };
      this.listPhaseGt[i] = previous;
      if (i > 0) {
        this.listPhaseGt[i - 1].next = previous;
      }
      label_index = label_index + width_label;
    }
    const uniquePredCount = new Set(this.predictionArr).size;
    const uniqueLabelCount = new Set(this.labelArr).size;
    const uniqueCount = Math.max(uniquePredCount, uniqueLabelCount)
    this.classService.setClasses([...Array(uniqueCount).keys()]);
    //this.classService.setClasses([0, 1, 2, 3, 4, 5, 6]); //TODO: will be expanded
    this.classService.setCurrentClass(0);

    //this.scoreService.initConfMat();
    //this.updateMultiVideoScore(video_id);

  }


  phaseAction(event: MouseEvent | TouchEvent, activePhase: Phase, gt: boolean = false) {
    const container = document.getElementById('timephase');
    if (container && !this.isDragging) {
      if (this.tool == 'cut') {
        let width = container.clientWidth;
        let rect = container.getBoundingClientRect();
        if('touches' in event){
          var offset = (100 * (event.touches[0].clientX - rect.left)) / width;
        }
        else{
          var offset = (100 * (event.clientX - rect.left)) / width;
        }
        let newWidth = offset - activePhase.start;

        let newPhase: Phase = {
          start: offset,
          width: activePhase.width - newWidth,
          label: this.classService.currentClass,
          previous: activePhase,
          next: activePhase.next,
          exists: true,
        };
        activePhase.width = newWidth;
        activePhase.next = newPhase;
        if (gt) {
          let index = this.listPhaseGt.indexOf(activePhase);
          this.listPhaseGt.splice(index + 1, 0, newPhase);
        } else {
          let index = this.listPhasePrediction.indexOf(activePhase);
          this.listPhasePrediction.splice(index + 1, 0, newPhase);
        }
      } else if (this.tool == 'fill') {
        activePhase.label = this.classService.currentClass;
      } else if (this.tool == 'delete') {
        if (activePhase.next) {
          activePhase.next.start = activePhase.start;
          activePhase.next.width += activePhase.width;
          this.deletePhase(activePhase);
        } else if (activePhase.previous) {
          activePhase.previous.width += activePhase.width;
          this.deletePhase(activePhase);
        }
      }
    }

    if(this.scoreService.isSelectedVideo) {
      console.log('in phase action');
      this.updateMultiVideoScore(this.scoreService.selectedVideo);
    } else {
      this.updateScore();
    }
  }

  dragPhase(event: MouseEvent | TouchEvent) {
    if (this.isDragging && this.activePhase) {
      const container = document.getElementById('timephase');

      event.preventDefault();

      if (this.activePhase.next && container) {
        let width = container.clientWidth;
        if('touches' in event){
          let new_x = event.touches[0].pageX
          var offset = (100 * (new_x - this.startPosition )) / width
          this.startPosition = new_x
        }
        else{
          var offset = (100 * event.movementX) / width;
        }

        if (
          this.activePhase.width + offset > 0 &&
          this.activePhase.next.width - offset > 0
        ) {
          this.activePhase.width += offset;
          this.activePhase.next.start += offset;
          this.activePhase.next.width -= offset;
        }
      }
      //this.updateScore();
    }
  }
  startDragging(event: MouseEvent | TouchEvent, phase: Phase) {
    this.isDragging = true;
    this.activePhase = phase;
  }
  stopDragging() {
    this.isDragging = false;
    let n_phases = this.listPhasePrediction.length;
    for (let i = 0; i < n_phases; i++) {
      let current_phase = this.listPhasePrediction[i];
      if (!(current_phase.width > 0)) {
        this.deletePhase(current_phase);
      }
    }
    //this.updateScore();
  }

  updateListPhase() {
    this.listPhasePrediction = this.listPhasePrediction.filter((element) => {
      return element.exists;
    });
    this.listPhaseGt = this.listPhaseGt.filter((element) => {
      return element.exists;
    });
  }
  deletePhase(phase: Phase) {
    if (phase.previous) {
      phase.previous.next = phase.next;
    }
    if (phase.next) {
      phase.next.previous = phase.previous;
    }
    phase.exists = false;
  }

  updateScoreOld() {
    if (this.classService.classes) {
      this.updateListPhase();

      var predicted = new Array<number>(this.nFrames);
      var groundtruth = new Array<number>(this.nFrames);

      var phasePredicted = this.listPhasePrediction[0];
      var phaseGt = this.listPhaseGt[0];

      for (let i = 0; i < this.nFrames; i++) {
        let step = (100 * i) / this.nFrames;
        predicted[i] = phasePredicted.label;
        groundtruth[i] = phaseGt.label;
        if (phasePredicted.next) {
          if (phasePredicted.start + phasePredicted.width < step) {
            phasePredicted = phasePredicted.next;
          }
        }
        if (phaseGt.next) {
          if (phaseGt.start + phaseGt.width < step) {
            phaseGt = phaseGt.next;
          }
        }
      }

      this.scoreService.updateConfusionMatrixFromArray(predicted, groundtruth);
    }
  }

  //one video updated
  updateMultiVideoScore(video_id : number) {
    if (this.classService.classes) {
      this.updateListPhase();

      this.segment_arr_pred = [];
      this.segment_arr_label = [];


      var phasePredicted = this.listPhasePrediction[0];
      var phaseGt = this.listPhaseGt[0];

      for(let i=0; i<this.listPhasePrediction.length; i++) {
        let repeated: Array<number> = new Array(Math.floor(phasePredicted.width)).fill(Math.floor(phasePredicted.label)).flat();
        this.segment_arr_pred = this.segment_arr_pred.concat(repeated);
        if(phasePredicted.next) {
          phasePredicted = phasePredicted.next;
        }
      }

      for(let i=0; i<this.listPhaseGt.length; i++) {
        let repeated: Array<number> = new Array(Math.floor(phaseGt.width)).fill(Math.floor(phaseGt.label)).flat();
        this.segment_arr_label = this.segment_arr_label.concat(repeated);
        if(phaseGt.next) {
          phaseGt = phaseGt.next;
        }
      }
      this.scoreService.updateConfusionMatrixFromArrayMultiVideos(
          this.segment_arr_pred,
          this.segment_arr_label,
          video_id,
          this.video_count,
          this.isOneVideoUpdate
      );

    }
  }

  updateScore() {

    if (this.classService.classes) {
      this.updateListPhase();

      this.segment_arr_pred = [];
      this.segment_arr_label = [];

      var phasePredicted = this.listPhasePrediction[0];
      var phaseGt = this.listPhaseGt[0];

      console.log('after updated');
      console.log(this.listPhasePrediction);
      for(let i=0; i<this.listPhasePrediction.length; i++) {
        let repeated: Array<number> = new Array(Math.floor(phasePredicted.width)).fill(Math.floor(phasePredicted.label)).flat();
        this.segment_arr_pred = this.segment_arr_pred.concat(repeated);
        if(phasePredicted.next) {
          phasePredicted = phasePredicted.next;
        }
      }

      for(let i=0; i<this.listPhaseGt.length; i++) {
        let repeated: Array<number> = new Array(Math.floor(phaseGt.width)).fill(Math.floor(phaseGt.label)).flat();
        this.segment_arr_label = this.segment_arr_label.concat(repeated);
        if(phaseGt.next) {
          phaseGt = phaseGt.next;
        }
      }
      this.scoreService.updateConfusionMatrixFromArray(this.segment_arr_pred, this.segment_arr_label);
    }
  }

   createLabeledData(map: Map<string, number>, data: { label: string, value: number }[]): number[] {
    let labels: number[] = [];
    for (let d of data) {
      let times = d.value;
      let label = map.get(d.label);
      labels.push(...Array(times).fill(label));
    }
    return labels;
  }

  numberOnly(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }
  videoLoaded() {
    this.videoPlayerCtx = this.videoplayer.nativeElement
    this.nFrames = Math.round(this.videoPlayerCtx.duration * this.framerate)
    this.updateScore()

  }
  setCurrentVideoFrame(){
    if(this.videoPlayerCtx)
      this.currentTime = this.videoPlayerCtx.currentTime
    else{
      this.currentTime = 0
    }
  }

  setCurrentTime(data:Event){
    this.currentTime = 100*this.videoPlayerCtx.currentTime / this.videoPlayerCtx.duration

  }
  onFileSelected() {
    const inputNode: any = document.querySelector('#file');
    if (typeof (FileReader) !== 'undefined') {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.localUrl = e.target.result;
      };

      reader.readAsArrayBuffer(inputNode.files[0]);
    }
  }
  updateFramerate(){
    this.nFrames = Math.round(this.videoPlayerCtx.duration * this.framerate)
    this.updateScore()
  }

  calculateMultiScore(file : object) {


  }

}
